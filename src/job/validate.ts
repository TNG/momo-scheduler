import humanInterval from 'human-interval';
import { parseExpression } from 'cron-parser';

import { Logger } from '../logging/Logger';
import { MomoErrorType } from '../logging/error/MomoErrorType';
import { momoError } from '../logging/error/MomoError';
import { CronSchedule, IntervalSchedule, MomoJob, isCronSchedule } from './MomoJob';

export function validate({ name, schedule, concurrency, maxRunning }: MomoJob, logger?: Logger): boolean {
  if (maxRunning !== undefined && maxRunning < 0) {
    logger?.error('job cannot be defined', MomoErrorType.defineJob, { name, maxRunning }, momoError.invalidMaxRunning);
    return false;
  }

  if (concurrency !== undefined && concurrency < 1) {
    logger?.error(
      'job cannot be defined',
      MomoErrorType.defineJob,
      { name, concurrency },
      momoError.invalidConcurrency
    );
    return false;
  }

  if (maxRunning !== undefined && maxRunning > 0 && concurrency !== undefined && concurrency > maxRunning) {
    logger?.error(
      'job cannot be defined',
      MomoErrorType.defineJob,
      { name, concurrency, maxRunning },
      momoError.invalidConcurrency
    );
    return false;
  }

  if (isCronSchedule(schedule)) {
    return validateCronSchedule(schedule, name, logger);
  }

  return validateInterval(schedule, name, logger);
}

function validateInterval({ interval, firstRunAfter }: IntervalSchedule, name: string, logger?: Logger): boolean {
  const parsedInterval = humanInterval(interval);
  const parsedFirstRunAfter = typeof firstRunAfter === 'number' ? firstRunAfter : humanInterval(firstRunAfter);

  let error;
  if (typeof parsedFirstRunAfter !== 'number' || isNaN(parsedFirstRunAfter)) {
    error = momoError.nonParsableFirstRunAfter;
  } else if (parsedFirstRunAfter < 0) {
    error = momoError.invalidFirstRunAfter;
  }
  if (typeof parsedInterval !== 'number' || isNaN(parsedInterval)) {
    error = momoError.nonParsableInterval;
  } else if (parsedInterval <= 0) {
    error = momoError.invalidInterval;
  }
  if (error !== undefined) {
    logger?.error('job cannot be defined', MomoErrorType.defineJob, { name, interval, firstRunAfter }, error);
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
