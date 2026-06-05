import { DateTime } from 'luxon';

import { ExecutionStatus, type JobResult } from '../job/ExecutionInfo.js';
import type { Handler, JobParameters } from '../job/MomoJob.js';
import { MomoErrorType } from '../logging/error/MomoErrorType.js';
import type { Logger } from '../logging/Logger.js';
import type { JobEntity } from '../repository/JobEntity.js';
import type { JobRepository } from '../repository/JobRepository.js';
import type { SchedulesRepository } from '../repository/SchedulesRepository.js';

export class JobExecutor {
  private stopped = false;

  constructor(
    private readonly handler: Handler,
    private readonly schedulesRepository: SchedulesRepository,
    private readonly jobRepository: JobRepository,
    private readonly logger: Logger,
  ) {}

  stop(): void {
    this.stopped = true;
  }

  async execute(
    jobEntity: JobEntity,
    parameters?: JobParameters,
  ): Promise<JobResult> {
    const { added, running } = await this.schedulesRepository.addExecution(
      jobEntity.name,
      jobEntity.maxRunning,
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

    const { started, result } = await this.executeHandler(
      jobEntity,
      parameters,
    );

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
      await this.schedulesRepository.removeExecution(jobEntity.name);
    }
    return result;
  }

  private async executeHandler(
    jobEntity: JobEntity,
    parameters?: JobParameters,
  ): Promise<{ started: DateTime; result: JobResult }> {
    this.logger.debug('run job', { name: jobEntity.name });
    const started = DateTime.now();

    let result: JobResult;
    try {
      const data = await this.handler(parameters);
      result = {
        status: ExecutionStatus.finished,
        handlerResult: data ?? 'finished',
      };
    } catch (e: unknown) {
      const message = (e as Partial<Error>).message ?? 'unknown error';
      this.logger.error(
        'job failed',
        MomoErrorType.executeJob,
        { name: jobEntity.name },
        e,
      );
      result = { status: ExecutionStatus.failed, handlerResult: message };
    }
    return { started, result };
  }
}
