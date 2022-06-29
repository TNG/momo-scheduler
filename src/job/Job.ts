import { WithoutId } from 'mongodb';
import { CronSchedule, Handler, IntervalSchedule, MomoJob, isIntervalSchedule } from './MomoJob';
import { JobEntity } from '../repository/JobEntity';

export type MomoJobStatus = WithoutId<JobEntity>;

export interface JobDefinition {
  name: string;
  schedule: Required<IntervalSchedule> | CronSchedule;
  concurrency: number;
  maxRunning: number;
}

export interface Job extends JobDefinition {
  handler: Handler;
}

/**
 * sets default values
 *
 * @param momoJob
 */
export function toJob(momoJob: MomoJob): Job {
  const schedule = isIntervalSchedule(momoJob.schedule) ? { firstRunAfter: 0, ...momoJob.schedule } : momoJob.schedule;

  return {
    concurrency: 1,
    maxRunning: 0,
    ...momoJob,
    schedule,
  };
}

/**
 * removes properties that are not part of the JobDefinition interface
 *
 * @param job
 */
export function toJobDefinition<T extends JobDefinition>({
  name,
  schedule,
  maxRunning,
  concurrency,
}: T): JobDefinition {
  return { name, schedule, maxRunning, concurrency };
}
