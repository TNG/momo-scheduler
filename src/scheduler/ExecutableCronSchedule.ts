import { CronJob } from 'cron';
import CronExpressionParser from 'cron-parser';
import { DateTime } from 'luxon';

import type { CronSchedule } from '../job/MomoJob';
import { momoError } from '../logging/error/MomoError';
import { MomoErrorType } from '../logging/error/MomoErrorType';
import type {
  ExecutableSchedule,
  ExecutionParameters,
  NextExecutionTime,
} from './ExecutableSchedule';

export class ExecutableCronSchedule
  implements ExecutableSchedule<CronSchedule>
{
  private readonly cronSchedule: string;
  private scheduledJob?: CronJob;

  constructor({ cronSchedule }: CronSchedule) {
    this.cronSchedule = cronSchedule;
  }

  toObject(): CronSchedule {
    return { cronSchedule: this.cronSchedule };
  }

  execute({
    callback,
    jobParameters,
    logger,
    errorMessage,
  }: ExecutionParameters): NextExecutionTime {
    this.validateCronSchedule();

    this.scheduledJob = new CronJob(this.cronSchedule, async () =>
      callback(jobParameters),
    );
    try {
      this.scheduledJob.start();
    } catch (e) {
      logger.error(errorMessage, MomoErrorType.internal, {}, e);
    }

    return {
      nextExecution: DateTime.fromMillis(
        this.scheduledJob.nextDate().toMillis(),
      ),
    };
  }

  async stop(): Promise<void> {
    if (this.scheduledJob) {
      await this.scheduledJob.stop();
      this.scheduledJob = undefined;
    }
  }

  isStarted(): boolean {
    return !!this.scheduledJob;
  }

  private validateCronSchedule(): void {
    try {
      CronExpressionParser.parse(this.cronSchedule);
    } catch {
      // the cron schedule was already validated when the job was defined
      throw momoError.nonParsableCronSchedule;
    }
  }
}
