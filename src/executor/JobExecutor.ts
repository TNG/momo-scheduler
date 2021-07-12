import { DateTime } from 'luxon';

import { JobEntity } from '../repository/JobEntity';
import { MomoErrorType } from '../logging/error/MomoErrorType';
import { ExecutionStatus, JobResult } from '../job/ExecutionInfo';
import { getJobRepository } from '../repository/getJobRepository';
import { Logger } from '../logging/Logger';
import { Handler } from '../job/MomoJob';

export class JobExecutor {
  constructor(private readonly handler: Handler, private readonly logger: Logger) {}

  public async execute(jobEntity: JobEntity): Promise<JobResult> {
    const jobRepository = getJobRepository();

    const incremented = await jobRepository.incrementRunning(jobEntity.name, jobEntity.maxRunning);
    if (!incremented) {
      this.logger.debug('maxRunning reached, skip', {
        name: jobEntity.name,
        running: jobEntity.maxRunning,
      });
      return {
        status: ExecutionStatus.maxRunningReached,
      };
    }

    const { started, result } = await this.executeHandler(jobEntity);

    await getJobRepository().updateJob(jobEntity.name, {
      executionInfo: {
        lastStarted: started.toISO(),
        lastFinished: DateTime.now().toISO(),
        lastResult: result,
      },
    });

    this.logger.debug('finished job', {
      name: jobEntity.name,
      status: result.status,
    });

    await jobRepository.decrementRunning(jobEntity.name);

    return result;
  }

  private async executeHandler(jobEntity: JobEntity): Promise<{ started: DateTime; result: JobResult }> {
    this.logger.debug('run job', { name: jobEntity.name });
    const started = DateTime.now();

    let result: JobResult;
    try {
      const data = await this.handler();
      result = {
        status: ExecutionStatus.finished,
        handlerResult: data !== undefined ? data : undefined,
      };
    } catch (e) {
      this.logger.error('job failed', MomoErrorType.executeJob, { name: jobEntity.name }, e);
      result = { status: ExecutionStatus.failed, handlerResult: e.message };
    }
    return { started, result };
  }
}
