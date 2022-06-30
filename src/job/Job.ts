import humanInterval from 'human-interval';
import { Handler, MomoJob } from './MomoJob';
import { momoError } from '../logging/error/MomoError';

export interface JobDefinition {
  name: string;
  interval: string;
  parsedInterval: number;
  firstRunAfter: number;
  concurrency: number;
  maxRunning: number;
}

export interface Job extends JobDefinition {
  handler: Handler;
}

export function toJob(job: MomoJob): Job {
  const firstRunAfter =
    job.firstRunAfter !== undefined
      ? typeof job.firstRunAfter === 'number'
        ? job.firstRunAfter
        : humanInterval(job.firstRunAfter)
      : 0;
  if (firstRunAfter === undefined || isNaN(firstRunAfter)) {
    // firstRunAfter was already validated
    throw momoError.invalidFirstRunAfter;
  }

  const parsedInterval = humanInterval(job.interval);
  if (parsedInterval === undefined || isNaN(parsedInterval)) {
    // parsedInterval was already validated
    throw momoError.nonParsableInterval;
  }

  return { concurrency: 1, maxRunning: 0, ...job, firstRunAfter, parsedInterval };
}

export function toJobDefinition<T extends JobDefinition>({
  name,
  interval,
  parsedInterval,
  firstRunAfter,
  maxRunning,
  concurrency,
}: T): JobDefinition {
  return { name, interval, parsedInterval, firstRunAfter, maxRunning, concurrency };
}
