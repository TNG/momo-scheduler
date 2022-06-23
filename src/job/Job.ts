import { WithoutId } from 'mongodb';

import { Handler, MomoJob } from './MomoJob';
import { JobEntity } from '../repository/JobEntity';

export type MomoJobStatus = WithoutId<JobEntity>;

export interface JobDefinition {
  name: string;
  interval?: string;
  cronSchedule?: string;
  // TODO: Make sure it's clear in the documentation that this has no impact on cron jobs
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
    cronSchedule: job.cronSchedule,
    firstRunAfter: job.firstRunAfter,
    maxRunning: job.maxRunning,
    concurrency: job.concurrency,
  };
}
