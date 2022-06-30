import humanInterval from 'human-interval';
import { parseExpression } from 'cron-parser';

import { Logger } from '../logging/Logger';
import { MomoErrorType } from '../logging/error/MomoErrorType';
import { momoError } from '../logging/error/MomoError';
import { CronSchedule, IntervalSchedule, MomoJob, isCronSchedule, isIntervalSchedule } from './MomoJob';

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

  if (isIntervalSchedule(schedule)) {
    return validateInterval(schedule, name, logger);
  }

  if (isCronSchedule(schedule)) {
    return validateCronSchedule(schedule, name, logger);
  }

  return false;
}

function validateInterval({ interval, firstRunAfter }: IntervalSchedule, name: string, logger?: Logger): boolean {
  const parsedInterval = humanInterval(interval);
  const parsedFirstRunAfter =
    firstRunAfter !== undefined && typeof firstRunAfter === 'number' ? firstRunAfter : humanInterval(firstRunAfter);
  const invalidFirstRunAfter =
    parsedFirstRunAfter !== undefined && (isNaN(parsedFirstRunAfter) || parsedFirstRunAfter < 0);
  const invalidInterval = parsedInterval === undefined || isNaN(parsedInterval) || parsedInterval <= 0;

  if (invalidInterval || invalidFirstRunAfter) {
    logger?.error(
      'job cannot be defined',
      MomoErrorType.defineJob,
      { name, interval, firstRunAfter },
      // TODO send correct error
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
