import { DateTime } from 'luxon';

import { ExecutionStatus, JobResult } from '../job/ExecutionInfo';
import { ExecutionsRepository } from '../repository/ExecutionsRepository';
import { Handler } from '../job/MomoJob';
import { JobEntity } from '../repository/JobEntity';
import { JobRepository } from '../repository/JobRepository';
import { Logger } from '../logging/Logger';
import { MomoErrorType } from '../logging/error/MomoErrorType';

export class JobExecutor {
  private stopped = false;

  constructor(
    private readonly handler: Handler,
    private readonly scheduleId: string,
    private readonly executionsRepository: ExecutionsRepository,
    private readonly jobRepository: JobRepository,
    private readonly logger: Logger
  ) {}

  stop(): void {
    this.stopped = true;
  }

  async execute(jobEntity: JobEntity): Promise<JobResult> {
    const { added, running } = await this.executionsRepository.addExecution(
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

    await this.jobRepository.updateJob(jobEntity.name, {
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
      await this.executionsRepository.removeExecution(this.scheduleId, jobEntity.name);
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
        handlerResult: data ?? 'finished',
      };
    } catch (e) {
      this.logger.error('job failed', MomoErrorType.executeJob, { name: jobEntity.name }, e);
      result = { status: ExecutionStatus.failed, handlerResult: e.message };
    }
    return { started, result };
  }
}
