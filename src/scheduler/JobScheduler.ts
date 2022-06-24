import { DateTime } from 'luxon';
import { min } from 'lodash';
import { ExecutionStatus, JobResult } from '../job/ExecutionInfo';
import { ExecutionsRepository } from '../repository/ExecutionsRepository';
import { Job } from '../job/Job';
import { JobExecutor } from '../executor/JobExecutor';
import { JobRepository } from '../repository/JobRepository';
import { Logger } from '../logging/Logger';
import { MomoErrorType } from '../logging/error/MomoErrorType';
import { MomoJobDescription, jobDescriptionFromEntity } from '../job/MomoJobDescription';
import { TimeoutHandle } from '../timeout/setSafeIntervalWithDelay';
import { momoError } from '../logging/error/MomoError';
import { ExecutableInterval } from './ExecutableInterval';
import { ExecutableCronSchedule } from './ExecutableCronSchedule';
import { toExecutableSchedule } from './ExecutableSchedule';

export class JobScheduler {
  private jobHandle?: TimeoutHandle;
  private unexpectedErrorCount = 0;
  private executableSchedule?: ExecutableInterval | ExecutableCronSchedule;

  constructor(
    private readonly jobName: string,
    private readonly jobExecutor: JobExecutor,
    private readonly scheduleId: string,
    private readonly executionsRepository: ExecutionsRepository,
    private readonly jobRepository: JobRepository,
    private readonly logger: Logger
  ) {}

  static forJob(
    scheduleId: string,
    job: Job,
    logger: Logger,
    executionsRepository: ExecutionsRepository,
    jobRepository: JobRepository
  ): JobScheduler {
    const executor = new JobExecutor(job.handler, scheduleId, executionsRepository, jobRepository, logger);
    return new JobScheduler(job.name, executor, scheduleId, executionsRepository, jobRepository, logger);
  }

  getUnexpectedErrorCount(): number {
    return this.unexpectedErrorCount;
  }

  isStarted(): boolean {
    return this.jobHandle !== undefined;
  }

  async getJobDescription(): Promise<MomoJobDescription | undefined> {
    const jobEntity = await this.jobRepository.findOne({ name: this.jobName });
    if (!jobEntity) {
      this.logger.error(
        'get job description - job not found',
        MomoErrorType.scheduleJob,
        { name: this.jobName },
        momoError.jobNotFound
      );
      return;
    }

    const running = await this.executionsRepository.countRunningExecutions(jobEntity.name);
    const schedulerStatus =
      this.executableSchedule === undefined ? undefined : { schedule: this.executableSchedule.toObject(), running };

    return { ...jobDescriptionFromEntity(jobEntity), schedulerStatus };
  }

  async start(): Promise<void> {
    await this.stop();

    const jobEntity = await this.jobRepository.findOne({ name: this.jobName });
    if (!jobEntity) {
      this.logger.error(
        'cannot schedule job',
        MomoErrorType.scheduleJob,
        { name: this.jobName },
        momoError.jobNotFound
      );
      return;
    }

    this.executableSchedule = toExecutableSchedule(jobEntity.schedule);

    const { jobHandle, delay } = this.executableSchedule.execute(
      this.executeConcurrently.bind(this),
      this.logger,
      jobEntity.executionInfo
    );
    this.jobHandle = jobHandle;

    this.logger.debug(`scheduled job to run at ${DateTime.now().plus({ milliseconds: delay }).toISO()}`, {
      name: this.jobName,
      ...this.executableSchedule.toObject(),
    });
  }

  async stop(): Promise<void> {
    if (this.jobHandle) {
      clearTimeout(this.jobHandle.get());
      this.jobExecutor.stop();
      await this.executionsRepository.removeJob(this.scheduleId, this.jobName);
      this.jobHandle = undefined;
      this.executableSchedule = undefined;
    }
  }

  async executeOnce(): Promise<JobResult> {
    try {
      const jobEntity = await this.jobRepository.findOne({ name: this.jobName });
      if (!jobEntity) {
        this.logger.error(
          'job not found, skip execution',
          MomoErrorType.executeJob,
          { name: this.jobName },
          momoError.jobNotFound
        );
        return {
          status: ExecutionStatus.notFound,
        };
      }

      return this.jobExecutor.execute(jobEntity);
    } catch (e) {
      this.handleUnexpectedError(e);
      return {
        status: ExecutionStatus.failed,
      };
    }
  }

  async executeConcurrently(): Promise<void> {
    try {
      const jobEntity = await this.jobRepository.findOne({ name: this.jobName });
      if (!jobEntity) {
        this.logger.error(
          'job not found, skip execution',
          MomoErrorType.executeJob,
          { name: this.jobName },
          momoError.jobNotFound
        );
        return;
      }

      const running = await this.executionsRepository.countRunningExecutions(jobEntity.name);
      const numToExecute =
        jobEntity.maxRunning > 0
          ? min([jobEntity.concurrency, jobEntity.maxRunning - running]) ?? jobEntity.concurrency
          : jobEntity.concurrency;
      this.logger.debug('execute job', { name: this.jobName, times: numToExecute });

      for (let i = 0; i < numToExecute; i++) {
        // eslint-disable-next-line no-void
        void this.jobExecutor.execute(jobEntity).catch((e) => {
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
      error
    );
  }
}
