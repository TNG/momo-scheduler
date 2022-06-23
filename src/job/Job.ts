import { WithoutId } from 'mongodb';

import { CronSchedule, Handler, Interval, MomoJob } from './MomoJob';
import { JobEntity } from '../repository/JobEntity';

export type MomoJobStatus = WithoutId<JobEntity>;

export interface JobDefinition {
  name: string;
  schedule: Interval | CronSchedule;
  concurrency: number;
  maxRunning: number;
}

export interface Job extends JobDefinition {
  handler: Handler;
}

export function toJob(job: MomoJob): Job {
  return { concurrency: 1, maxRunning: 0, ...job };
}

export function toJobDefinition<T extends JobDefinition>(job: T): JobDefinition {
  return {
    name: job.name,
    schedule: job.schedule,
    maxRunning: job.maxRunning,
    concurrency: job.concurrency,
  };
}
