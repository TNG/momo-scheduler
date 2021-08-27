import { DateTime } from 'luxon';
import { min } from 'lodash';
import humanInterval from 'human-interval';

import { ExecutionStatus, JobResult } from '../job/ExecutionInfo';
import { Job } from '../job/Job';
import { JobExecutor } from '../executor/JobExecutor';
import { Logger } from '../logging/Logger';
import { MomoErrorType } from '../logging/error/MomoErrorType';
import { MomoJobDescription, jobDescriptionFromEntity } from '../job/MomoJobDescription';
import { TimeoutHandle, setIntervalWithDelay } from './setIntervalWithDelay';
import { calculateDelay } from './calculateDelay';
import { getExecutionsRepository, getJobRepository } from '../repository/getRepository';
import { momoError } from '../logging/error/MomoError';

export class JobScheduler {
  private jobHandle?: TimeoutHandle;
  private unexpectedErrorCount = 0;
  private interval?: string;

  constructor(
    private readonly jobName: string,
    private readonly immediate: boolean,
    private readonly jobExecutor: JobExecutor,
    private readonly scheduleId: string,
    private readonly logger: Logger
  ) {}

  static forJob(scheduleId: string, job: Job, logger: Logger): JobScheduler {
    const executor = new JobExecutor(job.handler, scheduleId, logger);
    return new JobScheduler(job.name, job.immediate, executor, scheduleId, logger);
  }

  getUnexpectedErrorCount(): number {
    return this.unexpectedErrorCount;
  }

  isStarted(): boolean {
    return this.jobHandle !== undefined;
  }

  async getJobDescription(): Promise<MomoJobDescription | undefined> {
    const jobEntity = await getJobRepository().findOne({ name: this.jobName });
    if (!jobEntity) {
      this.logger.error(
        'get job description - job not found',
        MomoErrorType.scheduleJob,
        { name: this.jobName },
        momoError.jobNotFound
      );
      return;
    }

    const running = await getExecutionsRepository().countRunningExecutions(jobEntity.name);
    const schedulerStatus = this.interval !== undefined ? { interval: this.interval, running } : undefined;

    return { ...jobDescriptionFromEntity(jobEntity), schedulerStatus };
  }

  async start(): Promise<void> {
    await this.stop();

    const jobEntity = await getJobRepository().findOne({ name: this.jobName });
    if (!jobEntity) {
      this.logger.error(
        'cannot schedule job',
        MomoErrorType.scheduleJob,
        { name: this.jobName },
        momoError.jobNotFound
      );
      return;
    }

    const interval = humanInterval(jobEntity.interval);
    if (interval === undefined || isNaN(interval)) {
      throw momoError.nonParsableInterval;
    }

    this.interval = jobEntity.interval;

    const delay = calculateDelay(interval, this.immediate, jobEntity);

    this.jobHandle = setIntervalWithDelay(this.executeConcurrently.bind(this), interval, delay);

    this.logger.debug(`scheduled job to run at ${DateTime.now().plus({ milliseconds: delay }).toISO()}`, {
      name: this.jobName,
      interval,
      delay,
    });
  }

  async stop(): Promise<void> {
    if (this.jobHandle) {
      clearInterval(this.jobHandle.get());
      this.jobExecutor.stop();
      await getExecutionsRepository().removeJob(this.scheduleId, this.jobName);
      this.jobHandle = undefined;
      this.interval = undefined;
    }
  }

  async executeOnce(): Promise<JobResult> {
    try {
      const jobEntity = await getJobRepository().findOne({ name: this.jobName });
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
      const jobEntity = await getJobRepository().findOne({ name: this.jobName });
      if (!jobEntity) {
        this.logger.error(
          'job not found, skip execution',
          MomoErrorType.executeJob,
          { name: this.jobName },
          momoError.jobNotFound
        );
        return;
      }

      const running = await getExecutionsRepository().countRunningExecutions(jobEntity.name);
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

  private handleUnexpectedError(error: Error): void {
    this.unexpectedErrorCount++;
    this.logger.error(
      'an unexpected error occurred while executing job',
      MomoErrorType.executeJob,
      { name: this.jobName },
      error
    );
  }
}
