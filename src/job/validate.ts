import humanInterval from 'human-interval';

import { Job } from './Job';
import { Logger } from '../logging/Logger';
import { MomoErrorType } from '../logging/error/MomoErrorType';
import { momoError } from '../logging/error/MomoError';

export function validate({ name, interval, firstRunAfter, concurrency, maxRunning }: Job, logger?: Logger): boolean {
  const parsedFirstRunAfter = typeof firstRunAfter === 'number' ? firstRunAfter : humanInterval(firstRunAfter);
  if (parsedFirstRunAfter === undefined || isNaN(parsedFirstRunAfter) || parsedFirstRunAfter < 0) {
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

  const parsedInterval = humanInterval(interval);
  if (parsedInterval === undefined || isNaN(parsedInterval) || parsedInterval <= 0) {
    logger?.error('job cannot be defined', MomoErrorType.defineJob, { name, interval }, momoError.nonParsableInterval);
    return false;
  }

  return true;
}
