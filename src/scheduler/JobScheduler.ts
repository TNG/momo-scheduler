import { min } from 'lodash';

import { ExecutionStatus, JobResult } from '../job/ExecutionInfo';
import { SchedulesRepository } from '../repository/SchedulesRepository';
import { Job, ParsedIntervalSchedule } from '../job/Job';
import { JobExecutor } from '../executor/JobExecutor';
import { JobRepository } from '../repository/JobRepository';
import { Logger } from '../logging/Logger';
import { MomoErrorType } from '../logging/error/MomoErrorType';
import { MomoJobDescription, toMomoJobDescription } from '../job/MomoJobDescription';
import { momoError } from '../logging/error/MomoError';
import { ExecutableIntervalSchedule } from './ExecutableIntervalSchedule';
import { ExecutableCronSchedule } from './ExecutableCronSchedule';
import { toExecutableSchedule } from './ExecutableSchedule';
import { CronSchedule } from '../job/MomoJob';

export class JobScheduler<JobParams> {
  private unexpectedErrorCount = 0;
  private executableSchedule?: ExecutableIntervalSchedule<JobParams> | ExecutableCronSchedule<JobParams>;

  constructor(
    private readonly jobName: string,
    private readonly jobExecutor: JobExecutor<JobParams>,
    private readonly schedulesRepository: SchedulesRepository,
    private readonly jobRepository: JobRepository,
    private readonly logger: Logger,
  ) {}

  static forJob<JobParams>(
    job: Job<ParsedIntervalSchedule | CronSchedule, JobParams>,
    logger: Logger,
    schedulesRepository: SchedulesRepository,
    jobRepository: JobRepository,
  ): JobScheduler<JobParams> {
    const executor = new JobExecutor(job.handler, schedulesRepository, jobRepository, logger);
    return new JobScheduler(job.name, executor, schedulesRepository, jobRepository, logger);
  }

  getUnexpectedErrorCount(): number {
    return this.unexpectedErrorCount;
  }

  isStarted(): boolean {
    return this.executableSchedule?.isStarted() ?? false;
  }

  async getJobDescription(): Promise<MomoJobDescription<unknown> | undefined> {
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

    const jobEntity = await this.jobRepository.findOne<JobParams>({ name: this.jobName });
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

  async executeOnce(parameters?: JobParams): Promise<JobResult> {
    try {
      const jobEntity = await this.jobRepository.findOne<JobParams>({ name: this.jobName });
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

  async executeConcurrently(parameters?: JobParams): Promise<void> {
    try {
      const jobEntity = await this.jobRepository.findOne<JobParams>({ name: this.jobName });
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
          ? min([jobEntity.concurrency, jobEntity.maxRunning - running]) ?? jobEntity.concurrency
          : jobEntity.concurrency;
      this.logger.debug('execute job', { name: this.jobName, times: numToExecute });

      for (let i = 0; i < numToExecute; i++) {
        // eslint-disable-next-line no-void
        void this.jobExecutor.execute(jobEntity, parameters).catch((e) => {
          this.handleUnexpectedError(e);
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
}
