import { parseExpression } from 'cron-parser';
import { CronJob } from 'cron';
import { DateTime } from 'luxon';

import { CronSchedule } from '../job/MomoJob';
import { ExecutableSchedule, ExecutionParameters, NextExecutionTime } from './ExecutableSchedule';
import { momoError } from '../logging/error/MomoError';
import { MomoErrorType } from '../logging/error/MomoErrorType';

export class ExecutableCronSchedule<JobParams = unknown> implements ExecutableSchedule<JobParams, CronSchedule> {
  private readonly cronSchedule: string;
  private scheduledJob?: CronJob;

  constructor({ cronSchedule }: CronSchedule) {
    this.cronSchedule = cronSchedule;
  }

  toObject(): CronSchedule {
    return { cronSchedule: this.cronSchedule };
  }

  execute({ callback, jobParameters, logger, errorMessage }: ExecutionParameters<JobParams>): NextExecutionTime {
    this.validateCronSchedule();

    this.scheduledJob = new CronJob(this.cronSchedule, async () => callback(jobParameters));
    try {
      this.scheduledJob.start();
    } catch (e) {
      logger.error(errorMessage, MomoErrorType.internal, {}, e);
    }

    return { nextExecution: DateTime.fromMillis(this.scheduledJob.nextDate().toMillis()) };
  }

  stop(): void {
    if (this.scheduledJob) {
      this.scheduledJob.stop();
      this.scheduledJob = undefined;
    }
  }

  isStarted(): boolean {
    return !!this.scheduledJob;
  }

  private validateCronSchedule(): void {
    try {
      parseExpression(this.cronSchedule);
    } catch {
      // the cron schedule was already validated when the job was defined
      throw momoError.nonParsableCronSchedule;
    }
  }
}
