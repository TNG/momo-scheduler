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
import { JobParameters } from '../job/MomoJob';
import { setSafeTimeout } from '../timeout/safeTimeouts';

export class JobScheduler {
  private unexpectedErrorCount = 0;
  private executorError: boolean[] = [];
  private executableSchedule?: ExecutableIntervalSchedule | ExecutableCronSchedule;

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
    if (this.executableSchedule) {
      this.executableSchedule.stop();
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
      this.handleUnexpectedError(-1, e);
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

      this.executorError = new Array(numToExecute);

      for (let instanceNumber = 0; instanceNumber < numToExecute; instanceNumber++) {
        this.logger.debug('executing job instance', { instanceNumber });
        this.executorError[instanceNumber] = false;

        const executionTimeout =
          jobEntity.timeout !== undefined
            ? setSafeTimeout(
                async () => this.handleTimeoutReached(instanceNumber),
                jobEntity.timeout,
                this.logger,
                'error occurred in timeout',
              )
            : undefined;

        // eslint-disable-next-line no-void
        void this.jobExecutor
          .execute(jobEntity, parameters)
          .catch((e) => {
            this.handleUnexpectedError(instanceNumber, e);
          })
          .finally(() => {
            if (this.executorError[instanceNumber] !== undefined) {
              this.logger.debug('job executed correctly, cancel timout', { instanceNumber });
              clearTimeout(executionTimeout);
            }
          });
      }
    } catch (e) {
      this.handleUnexpectedError(-1, e);
    }
  }

  private handleTimeoutReached(instanceNumber: number): void {
    this.logger.error('timeout reached', MomoErrorType.executeJob, { name: this.jobName, instanceNumber });
    // TODO how to clean up? what to do now?
    // clean up only the failed execution? But we do not store every execution of a concurrent job separately, we only have one executionInfo. Change it to an array of length maxRunning?
    // or clean up everything - that is, stop the job and restart it?
  }

  private handleUnexpectedError(instanceNumber: number, error: unknown): void {
    this.unexpectedErrorCount++;
    if (instanceNumber >= 0) {
      this.executorError[instanceNumber] = true;
    }

    this.logger.error(
      'an unexpected error occurred while executing job',
      MomoErrorType.executeJob,
      { name: this.jobName, instanceNumber },
      error,
    );
  }
}
