import { WithoutId } from 'mongodb';

import { Handler, MomoJob } from './MomoJob';
import { JobEntity } from '../repository/JobEntity';

export type MomoJobStatus = WithoutId<JobEntity>;

export interface JobDefinition {
  name: string;
  interval: string;
  firstRunAfter: number;
  concurrency: number;
  maxRunning: number;
}

export interface Job extends JobDefinition {
  handler: Handler;
}

export function toJob(job: MomoJob): Job {
  const firstRunAfter = job.firstRunAfter ?? 0;
  return { concurrency: 1, maxRunning: 0, firstRunAfter, ...job };
}

export function toJobDefinition<T extends JobDefinition>(job: T): JobDefinition {
  return {
    name: job.name,
    interval: job.interval,
    firstRunAfter: job.firstRunAfter,
    maxRunning: job.maxRunning,
    concurrency: job.concurrency,
  };
}
