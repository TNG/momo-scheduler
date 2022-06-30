import { parseExpression } from 'cron-parser';
import { CronJob } from 'cron';
import { DateTime } from 'luxon';

import { CronSchedule } from '../job/MomoJob';
import { ExecutableSchedule, NextExecutionTime } from './ExecutableSchedule';
import { momoError } from '../logging/error/MomoError';
import { MomoErrorType } from '../logging/error/MomoErrorType';
import { Logger } from '../logging/Logger';

export class ExecutableCronSchedule implements ExecutableSchedule<CronSchedule> {
  private readonly cronSchedule: string;
  private scheduledJob?: CronJob;

  constructor({ cronSchedule }: CronSchedule) {
    this.cronSchedule = cronSchedule;
  }

  toObject(): CronSchedule {
    return { cronSchedule: this.cronSchedule };
  }

  execute(callback: () => Promise<void>, logger: Logger, errorMessage: string): NextExecutionTime {
    this.validateCronSchedule();

    this.scheduledJob = new CronJob(this.cronSchedule, callback);
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
