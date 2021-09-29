import humanInterval from 'human-interval';

import { Job } from './Job';
import { Logger } from '../logging/Logger';
import { MomoErrorType } from '../logging/error/MomoErrorType';
import { momoError } from '../logging/error/MomoError';

export function validate({ name, interval, delay, concurrency, maxRunning }: Job, logger?: Logger): boolean {
  if (delay && delay < 0) {
    logger?.error('job cannot be defined', MomoErrorType.defineJob, { name, delay }, momoError.invalidDelay);
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
