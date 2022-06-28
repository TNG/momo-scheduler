import { ScheduledTask, schedule as cronSchedule } from 'node-cron';
import { parseExpression } from 'cron-parser';
import { DateTime } from 'luxon';
import { CronSchedule } from '../job/MomoJob';
import { ExecutableSchedule, ExecutionDelay } from './ExecutableSchedule';
import { momoError } from '../logging/error/MomoError';

export class ExecutableCronSchedule implements ExecutableSchedule<CronSchedule> {
  private readonly cronSchedule: string;
  private scheduledTask?: ScheduledTask;

  constructor({ cronSchedule }: CronSchedule) {
    this.cronSchedule = cronSchedule;
  }

  toObject(): CronSchedule {
    return { cronSchedule: this.cronSchedule };
  }

  execute(callback: () => Promise<void>): ExecutionDelay {
    this.validateCronSchedule();
    this.scheduledTask = cronSchedule(this.cronSchedule, callback);
    return { delay: parseExpression(this.cronSchedule).next().getTime() - DateTime.now().toMillis() };
  }

  stop(): void {
    if (this.scheduledTask !== undefined) {
      this.scheduledTask.stop();
      this.scheduledTask = undefined;
    }
  }

  isStarted(): boolean {
    return this.scheduledTask !== undefined;
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
