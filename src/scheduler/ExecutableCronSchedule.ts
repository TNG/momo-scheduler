import { ScheduledTask, schedule as cronSchedule } from 'node-cron';
import { parseExpression } from 'cron-parser';
import { DateTime } from 'luxon';
import { CronSchedule } from '../job/MomoJob';
import { ExecutableSchedule, ExecutionDelay } from './ExecutableSchedule';

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
}
