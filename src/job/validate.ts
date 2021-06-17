import humanInterval from 'human-interval';
import { Job } from './Job';
import { MomoError } from '../logging/error/MomoError';
import { MomoErrorType } from '../logging/error/MomoErrorType';
import { Logger } from '../logging/Logger';

export function validate({ name, interval, concurrency, maxRunning }: Job, logger?: Logger): boolean {
  if (maxRunning < 0) {
    logger?.error('job cannot be defined', MomoErrorType.defineJob, { name, maxRunning }, MomoError.invalidMaxRunning);
    return false;
  }

  if (concurrency < 1) {
    logger?.error(
      'job cannot be defined',
      MomoErrorType.defineJob,
      { name, concurrency },
      MomoError.invalidConcurrency
    );
    return false;
  }

  if (maxRunning > 0 && concurrency > maxRunning) {
    logger?.error(
      'job cannot be defined',
      MomoErrorType.defineJob,
      { name, concurrency, maxRunning },
      MomoError.invalidConcurrency
    );
    return false;
  }

  const parsedInterval = humanInterval(interval);
  if (!parsedInterval || isNaN(parsedInterval) || parsedInterval <= 0) {
    logger?.error('job cannot be defined', MomoErrorType.defineJob, { name, interval }, MomoError.nonParsableInterval);
    return false;
  }

  return true;
}
