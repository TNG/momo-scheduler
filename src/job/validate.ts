import humanInterval from 'human-interval';
import { parseExpression } from 'cron-parser';

import { Logger } from '../logging/Logger';
import { MomoErrorType } from '../logging/error/MomoErrorType';
import { momoError } from '../logging/error/MomoError';
import { CronSchedule, IntervalSchedule, isCronSchedule, isIntervalSchedule } from './MomoJob';
import { Job } from './Job';

export function validate({ name, schedule, concurrency, maxRunning }: Job, logger?: Logger): boolean {
  if (maxRunning < 0) {
    logger?.error('job cannot be defined', MomoErrorType.defineJob, { name, maxRunning }, momoError.invalidMaxRunning);
    return false;
  }

  if (concurrency < 1) {
    logger?.error(
      'job cannot be defined',
      MomoErrorType.defineJob,
      { name, concurrency },
      momoError.invalidConcurrency
    );
    return false;
  }

  if (maxRunning > 0 && concurrency > maxRunning) {
    logger?.error(
      'job cannot be defined',
      MomoErrorType.defineJob,
      { name, concurrency, maxRunning },
      momoError.invalidConcurrency
    );
    return false;
  }

  if (isIntervalSchedule(schedule)) {
    return validateInterval(schedule, name, logger);
  }

  if (isCronSchedule(schedule)) {
    return validateCronSchedule(schedule, name, logger);
  }

  return false;
}

function validateInterval(schedule: Required<IntervalSchedule>, name: string, logger?: Logger): boolean {
  const parsedInterval = humanInterval(schedule.interval);
  const invalidFirstRunAfter = schedule.firstRunAfter < 0;
  const invalidInterval = parsedInterval === undefined || isNaN(parsedInterval) || parsedInterval <= 0;

  if (invalidInterval || invalidFirstRunAfter) {
    logger?.error(
      'job cannot be defined',
      MomoErrorType.defineJob,
      { name, interval: schedule.interval, firstRunAfter: schedule.firstRunAfter },
      invalidInterval ? momoError.nonParsableInterval : momoError.invalidFirstRunAfter
    );
    return false;
  }

  return true;
}

function validateCronSchedule({ cronSchedule }: CronSchedule, name: string, logger?: Logger): boolean {
  try {
    parseExpression(cronSchedule);
    return true;
  } catch {
    logger?.error(
      'job cannot be defined',
      MomoErrorType.defineJob,
      { name, cronSchedule },
      momoError.nonParsableCronSchedule
    );
    return false;
  }
}
