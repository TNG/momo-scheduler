import { DateTime } from 'luxon';

import { JobEntity } from '../repository/JobEntity';
import { MomoErrorType } from '../logging/error/MomoErrorType';
import { ExecutionStatus, JobResult } from '../job/ExecutionInfo';
import { getExecutionsRepository, getJobRepository } from '../repository/getRepository';
import { Logger } from '../logging/Logger';
import { Handler } from '../job/MomoJob';

export class JobExecutor {
  private stopped = false;

  constructor(
    private readonly handler: Handler,
    private readonly scheduleId: string,
    private readonly logger: Logger
  ) {}

  stop(): void {
    this.stopped = true;
  }

  async execute(jobEntity: JobEntity): Promise<JobResult> {
    const executionsRepository = getExecutionsRepository();

    const { added, running } = await executionsRepository.addExecution(
      this.scheduleId,
      jobEntity.name,
      jobEntity.maxRunning
    );
    if (!added) {
      this.logger.debug('maxRunning reached, skip', {
        name: jobEntity.name,
        running,
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
      stopped: this.stopped,
    });

    if (!this.stopped) {
      await executionsRepository.removeExecution(this.scheduleId, jobEntity.name);
    }

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
