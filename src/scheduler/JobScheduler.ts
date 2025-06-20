import { min } from 'lodash';

import { ExecutionStatus, JobResult } from '../job/ExecutionInfo';
import { SchedulesRepository } from '../repository/SchedulesRepository';
import { Job } from '../job/Job';
import { JobExecutor } from '../executor/JobExecutor';
import { JobRepository } from '../repository/JobRepository';
import { Logger } from '../logging/Logger';
import { MomoErrorType } from '../logging/error/MomoErrorType';
import { MomoJobDescription, toMomoJobDescription } from '../job/MomoJobDescription';
import { momoError } from '../logging/error/MomoError';
import { ExecutableIntervalSchedule } from './ExecutableIntervalSchedule';
import { ExecutableCronSchedule } from './ExecutableCronSchedule';
import { toExecutableSchedule } from './ExecutableSchedule';
import { JobParameters, isNeverSchedule } from '../job/MomoJob';
import { setSafeTimeout } from '../timeout/safeTimeouts';

export class JobScheduler {
  private unexpectedErrorCount = 0;
  private executableSchedule?: ExecutableIntervalSchedule | ExecutableCronSchedule;
  private restartTimeout: NodeJS.Timeout | undefined;

  constructor(
    private readonly jobName: string,
    private readonly jobExecutor: JobExecutor,
    private readonly schedulesRepository: SchedulesRepository,
    private readonly jobRepository: JobRepository,
    private readonly logger: Logger,
  ) {}

  static forJob(
    job: Job,
    logger: Logger,
    schedulesRepository: SchedulesRepository,
    jobRepository: JobRepository,
  ): JobScheduler {
    const executor = new JobExecutor(job.handler, schedulesRepository, jobRepository, logger);
    return new JobScheduler(job.name, executor, schedulesRepository, jobRepository, logger);
  }

  getUnexpectedErrorCount(): number {
    return this.unexpectedErrorCount;
  }

  isStarted(): boolean {
    return this.executableSchedule?.isStarted() ?? false;
  }

  async getJobDescription(): Promise<MomoJobDescription | undefined> {
    const jobEntity = await this.jobRepository.findOne({ name: this.jobName });
    if (!jobEntity) {
      this.logger.error(
        'get job description - job not found',
        MomoErrorType.scheduleJob,
        { name: this.jobName },
        momoError.jobNotFound,
      );
      return;
    }

    const schedulerStatus = !this.executableSchedule
      ? undefined
      : {
          schedule: this.executableSchedule.toObject(),
          running: await this.schedulesRepository.countRunningExecutions(jobEntity.name),
        };

    return { ...toMomoJobDescription(jobEntity), schedulerStatus };
  }

  async start(): Promise<void> {
    await this.stop();

    const jobEntity = await this.jobRepository.findOne({ name: this.jobName });
    if (!jobEntity) {
      this.logger.error(
        'cannot schedule job',
        MomoErrorType.scheduleJob,
        { name: this.jobName },
        momoError.jobNotFound,
      );
      return;
    }

    if (isNeverSchedule(jobEntity.schedule)) {
      this.logger.debug(`do not start job specified to run 'never'`, {
        name: this.jobName,
      });
      return;
    }

    this.executableSchedule = toExecutableSchedule(jobEntity.schedule);

    const { nextExecution } = this.executableSchedule.execute({
      callback: this.executeConcurrently.bind(this),
      logger: this.logger,
      errorMessage: 'Concurrent execution failed',
      jobParameters: jobEntity.parameters,
      executionInfo: jobEntity.executionInfo,
    });

    this.logger.debug(`scheduled job to run at ${nextExecution}`, {
      name: this.jobName,
      ...this.executableSchedule.toObject(),
    });
  }

  async stop(): Promise<void> {
    if (this.restartTimeout) {
      this.logger.debug('clear restart timeout', { name: this.jobName });
      clearTimeout(this.restartTimeout);
    }

    if (this.executableSchedule) {
      await this.executableSchedule.stop();
      this.jobExecutor.stop();
      await this.schedulesRepository.removeJob(this.jobName);
      this.executableSchedule = undefined;
    }
  }

  async executeOnce(parameters?: JobParameters): Promise<JobResult> {
    try {
      const jobEntity = await this.jobRepository.findOne({ name: this.jobName });
      if (!jobEntity) {
        this.logger.error(
          'job not found, skip execution',
          MomoErrorType.executeJob,
          { name: this.jobName },
          momoError.jobNotFound,
        );
        return {
          status: ExecutionStatus.notFound,
        };
      }

      return this.jobExecutor.execute(jobEntity, parameters);
    } catch (e) {
      this.handleUnexpectedError(e);
      return {
        status: ExecutionStatus.failed,
      };
    }
  }

  async executeConcurrently(parameters?: JobParameters): Promise<void> {
    try {
      const jobEntity = await this.jobRepository.findOne({ name: this.jobName });
      if (!jobEntity) {
        this.logger.error(
          'job not found, skip execution',
          MomoErrorType.executeJob,
          { name: this.jobName },
          momoError.jobNotFound,
        );
        return;
      }

      const running = await this.schedulesRepository.countRunningExecutions(jobEntity.name);
      const numToExecute =
        jobEntity.maxRunning > 0
          ? (min([jobEntity.concurrency, jobEntity.maxRunning - running]) ?? jobEntity.concurrency)
          : jobEntity.concurrency;
      this.logger.debug('execute job', { name: this.jobName, times: numToExecute });

      for (let instanceNumber = 0; instanceNumber < numToExecute; instanceNumber++) {
        this.logger.debug('executing job instance', { instanceNumber });

        // eslint-disable-next-line no-void
        void this.jobExecutor.execute(jobEntity, parameters).catch(async (e) => {
          await this.handleUnexpectedErrorWithTimeout(e, jobEntity.timeout);
          return {
            status: ExecutionStatus.failed,
          };
        });
      }
    } catch (e) {
      this.handleUnexpectedError(e);
    }
  }

  private handleUnexpectedError(error: unknown): void {
    this.unexpectedErrorCount++;

    this.logger.error(
      'an unexpected error occurred while executing job',
      MomoErrorType.executeJob,
      { name: this.jobName },
      error,
    );
  }

  private async handleUnexpectedErrorWithTimeout(error: unknown, timeout: number | undefined): Promise<void> {
    this.unexpectedErrorCount++;

    if (timeout === undefined) {
      this.handleUnexpectedError(error);
      return;
    }

    this.logger.error(
      `an unexpected error occurred while executing job; stopping current job and scheduling restart after configured timout=${timeout} ms`,
      MomoErrorType.executeJob,
      { name: this.jobName },
      error,
    );

    await this.stop();

    // auto restart job after timeout
    this.restartTimeout = setSafeTimeout(
      async () => this.handleTimeoutReached(),
      timeout,
      this.logger,
      'error occurred in timeout',
    );
  }

  private async handleTimeoutReached(): Promise<void> {
    this.logger.error('timeout reached, restarting job now', MomoErrorType.executeJob, { name: this.jobName });
    await this.start();
  }
}
