import { WithoutId } from 'mongodb';

import { Handler, MomoJob } from './MomoJob';
import { JobEntity } from '../repository/JobEntity';

export type MomoJobStatus = WithoutId<JobEntity>;

export interface JobDefinition {
  name: string;
  interval: string;
  delay: number;
  concurrency: number;
  maxRunning: number;
}

export interface Job extends JobDefinition {
  immediate: boolean;
  handler: Handler;
}

export function toJob(job: MomoJob): Job {
  return { delay: 0, immediate: false, concurrency: 1, maxRunning: 0, ...job };
}

export function toJobDefinition<T extends JobDefinition>(job: T): JobDefinition {
  return {
    name: job.name,
    interval: job.interval,
    delay: job.delay,
    maxRunning: job.maxRunning,
    concurrency: job.concurrency,
  };
}
