import humanInterval from 'human-interval';

import { parseCronExpression } from 'cron-schedule';
import { Job } from './Job';
import { Logger } from '../logging/Logger';
import { MomoErrorType } from '../logging/error/MomoErrorType';
import { momoError } from '../logging/error/MomoError';

export function validate(
  { name, interval, cronSchedule, firstRunAfter, concurrency, maxRunning }: Job,
  logger?: Logger
): boolean {
  if (firstRunAfter < 0) {
    logger?.error(
      'job cannot be defined',
      MomoErrorType.defineJob,
      { name, firstRunAfter },
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

  if (interval === undefined && cronSchedule === undefined) {
    logger?.error('job cannot be defined', MomoErrorType.defineJob, { name }, momoError.missingIntervalAndCronSchedule);
    return false;
  }

  if (interval !== undefined && cronSchedule !== undefined) {
    logger?.error(
      'job cannot be defined',
      MomoErrorType.defineJob,
      { name },
      momoError.conflictingIntervalAndCronSchedule
    );
    return false;
  }

  if (interval !== undefined) {
    return validateInterval(interval, name, logger);
  }

  if (cronSchedule !== undefined) {
    return validateCronSchedule(cronSchedule, name, logger);
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
  try {
    parseCronExpression(cronSchedule);
  } catch (e) {
    logger?.error(
      'job cannot be defined',
      MomoErrorType.defineJob,
      { name, cronSchedule },
      momoError.invalidCronSchedule
    );
    return false;
  }

  return true;
}
