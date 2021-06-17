import { DateTime } from 'luxon';

import { JobEntity } from '../repository/JobEntity';
import { Job } from '../job/Job';
import { MomoErrorType } from '../logging/error/MomoErrorType';
import { ExecutionStatus, JobResult } from '../job/ExecutionInfo';
import { getJobRepository } from '../repository/getJobRepository';
import { Logger } from '../logging/Logger';

export class JobExecutor {
  constructor(private readonly job: Job, private readonly logger: Logger) {}

  public async execute(savedJob: JobEntity): Promise<JobResult> {
    this.update(savedJob);

    const jobRepository = getJobRepository();

    const incremented = await jobRepository.incrementRunning(this.job.name, this.job.maxRunning);
    if (!incremented) {
      this.logger.debug('maxRunning reached, skip', {
        name: this.job.name,
        running: this.job.maxRunning,
      });
      return {
        status: ExecutionStatus.maxRunningReached,
      };
    }

    const { started, result } = await this.executeHandler();

    await getJobRepository().updateJob(this.job.name, {
      executionInfo: {
        lastStarted: started.toISO(),
        lastFinished: DateTime.now().toISO(),
        lastResult: result,
      },
    });

    this.logger.debug('finished job', {
      name: this.job.name,
      status: result.status,
    });

    await jobRepository.decrementRunning(this.job.name);

    return result;
  }

  private update(savedJob: JobEntity) {
    if (this.job.maxRunning === savedJob.maxRunning && this.job.concurrency === savedJob.concurrency) {
      return;
    }

    this.logger.debug('update job from database', {
      name: this.job.name,
      concurrency: savedJob.concurrency,
      maxRunning: savedJob.maxRunning,
    });
    this.job.concurrency = savedJob.concurrency;
    this.job.maxRunning = savedJob.maxRunning;
  }

  private async executeHandler(): Promise<{ started: DateTime; result: JobResult }> {
    this.logger.debug('run job', { name: this.job.name });
    const started = DateTime.now();

    let result: JobResult;
    try {
      const data = await this.job.handler();
      result = {
        status: ExecutionStatus.finished,
        handlerResult: data !== undefined ? data : undefined,
      };
    } catch (e) {
      this.logger.error('job failed', MomoErrorType.executeJob, { name: this.job.name }, e);
      result = { status: ExecutionStatus.failed, handlerResult: e.message };
    }
    return { started, result };
  }
}
