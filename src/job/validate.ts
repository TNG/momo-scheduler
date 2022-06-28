import humanInterval from 'human-interval';
import { validate as validateCron } from 'node-cron';

import { Logger } from '../logging/Logger';
import { MomoErrorType } from '../logging/error/MomoErrorType';
import { momoError } from '../logging/error/MomoError';
import { isCronSchedule, isIntervalSchedule } from './MomoJob';
import { Job } from './Job';

export function validate({ name, schedule, concurrency, maxRunning }: Job, logger?: Logger): boolean {
  if (isIntervalSchedule(schedule) && schedule.firstRunAfter < 0) {
    logger?.error(
      'job cannot be defined',
      MomoErrorType.defineJob,
      { name, firstRunAfter: schedule.firstRunAfter },
      momoError.invalidFirstRunAfter
    );
    return false;
  }

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
    return validateInterval(schedule.interval, name, logger);
  }

  if (isCronSchedule(schedule)) {
    return validateCronSchedule(schedule.cronSchedule, name, logger);
  }

  return false;
}

function validateInterval(interval: string, name: string, logger?: Logger): boolean {
  const parsedInterval = humanInterval(interval);
  if (parsedInterval === undefined || isNaN(parsedInterval) || parsedInterval <= 0) {
    logger?.error('job cannot be defined', MomoErrorType.defineJob, { name, interval }, momoError.nonParsableInterval);
    return false;
  }

  return true;
}

function validateCronSchedule(cronSchedule: string, name: string, logger?: Logger): boolean {
  if (!validateCron(cronSchedule)) {
    logger?.error(
      'job cannot be defined',
      MomoErrorType.defineJob,
      { name, cronSchedule },
      momoError.nonParsableCronSchedule
    );
    return false;
  }
  return true;
}
