import { Cron, parseCronExpression } from 'cron-schedule';
import { DateTime } from 'luxon';
import { CronSchedule } from '../job/MomoJob';
import { momoError } from '../logging/error/MomoError';
import { setSafeTimeout } from '../timeout/safeTimeouts';
import { Logger } from '../logging/Logger';
import { ExecutableSchedule, HandleResult } from './ExecutableSchedule';

export class ExecutableCronSchedule implements ExecutableSchedule<CronSchedule> {
  private readonly cronSchedule: string;
  private timeout: NodeJS.Timeout | undefined;

  constructor({ cronSchedule }: CronSchedule) {
    this.cronSchedule = cronSchedule;
  }

  toObject(): CronSchedule {
    return { cronSchedule: this.cronSchedule };
  }

  execute(callback: () => Promise<void>, logger: Logger): HandleResult {
    const delay = this.calculateDelay();
    return this.executeInternal(delay, callback, logger);
  }

  executeInternal(delay: number, callback: () => Promise<void>, logger: Logger): HandleResult {
    const executeAndReschedule = async (): Promise<void> => {
      await callback();
      this.executeInternal(delay, callback, logger);
    };
    this.timeout = setSafeTimeout(executeAndReschedule, delay, logger, 'Concurrent execution failed');

    return { jobHandle: { get: () => this.timeout! }, delay };
  }

  private calculateDelay(): number {
    return this.parse().getNextDate().getTime() - DateTime.now().toMillis();
  }

  private parse(): Cron {
    try {
      return parseCronExpression(this.cronSchedule);
    } catch {
      // the cron schedule was already validated when the job was defined
      throw momoError.nonParsableCronSchedule;
    }
  }
}
