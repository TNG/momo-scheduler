import humanInterval from 'human-interval';
import { min } from 'lodash';

import { Job } from '../job/Job';
import { JobExecutor } from '../executor/JobExecutor';
import { setIntervalWithDelay, TimeoutHandle } from './setIntervalWithDelay';
import { calculateDelay } from './calculateDelay';
import { MomoError } from '../logging/error/MomoError';
import { MomoErrorType } from '../logging/error/MomoErrorType';
import { getJobRepository } from '../repository/getJobRepository';
import { Logger } from '../logging/Logger';
import { ExecutionStatus, JobResult } from '../job/ExecutionInfo';
import { DateTime } from 'luxon';

export class JobScheduler {
  private jobHandle?: TimeoutHandle;
  private unexpectedErrorCount = 0;

  constructor(private readonly job: Job, private readonly jobExecutor: JobExecutor, private readonly logger: Logger) {}

  public getUnexpectedErrorCount(): number {
    return this.unexpectedErrorCount;
  }

  public async run(): Promise<JobScheduler> {
    const interval = humanInterval(this.job.interval);
    if (!interval || isNaN(interval)) {
      throw MomoError.nonParsableInterval;
    }

    const [jobEntity] = await getJobRepository().find({ name: this.job.name });
    if (!jobEntity) {
      this.logger.error(
        'cannot schedule job',
        MomoErrorType.scheduleJob,
        { name: this.job.name },
        MomoError.jobNotFound
      );
      return this;
    }
    const delay = calculateDelay(interval, this.job.immediate, jobEntity);
    this.jobHandle = setIntervalWithDelay(this.executeConcurrently.bind(this), interval, delay);

    this.logger.debug(`scheduled job to run at ${DateTime.fromMillis(delay).toISO()}`, {
      name: this.job.name,
      interval,
      delay,
    });
    return this;
  }

  public stop(): void {
    if (this.jobHandle) {
      clearInterval(this.jobHandle.get());
    }
  }

  async executeOnce(): Promise<JobResult> {
    try {
      const [savedJob] = await getJobRepository().find({ name: this.job.name });
      if (!savedJob) {
        this.logger.error(
          'job not found, skip execution',
          MomoErrorType.executeJob,
          { name: this.job.name },
          MomoError.jobNotFound
        );
        return {
          status: ExecutionStatus.notFound,
        };
      }

      return this.jobExecutor.execute(savedJob);
    } catch (e) {
      this.handleUnexpectedError(e);
      return {
        status: ExecutionStatus.failed,
      };
    }
  }

  async executeConcurrently(): Promise<void> {
    try {
      const [savedJob] = await getJobRepository().find({ name: this.job.name });
      if (!savedJob) {
        this.logger.error(
          'job not found, skip execution',
          MomoErrorType.executeJob,
          { name: this.job.name },
          MomoError.jobNotFound
        );
        return;
      }

      const numToExecute =
        savedJob.maxRunning > 0
          ? min([savedJob.concurrency, savedJob.maxRunning - (savedJob.running ?? 0)]) ?? savedJob.concurrency
          : savedJob.concurrency;
      this.logger.debug('execute job', { name: this.job.name, times: numToExecute });

      for (let i = 0; i < numToExecute; i++) {
        void this.jobExecutor.execute(savedJob).catch((e) => {
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
      'an unexpected error occurred while running job',
      MomoErrorType.executeJob,
      { name: this.job.name },
      error
    );
  }
}
