import { WithoutId } from 'mongodb';
import { CronSchedule, Handler, IntervalSchedule, MomoJob } from './MomoJob';
import { JobEntity } from '../repository/JobEntity';
import { ExecutableIntervalSchedule } from '../scheduler/ExecutableIntervalSchedule';
import { ExecutableCronSchedule } from '../scheduler/ExecutableCronSchedule';

export type MomoJobStatus = WithoutId<JobEntity>;

export interface JobDefinition {
  name: string;
  schedule: IntervalSchedule | CronSchedule;
  concurrency: number;
  maxRunning: number;
}

export interface Job extends JobDefinition {
  handler: Handler;
}

export interface ExecutableJob extends Omit<Job, 'schedule'> {
  executableSchedule: ExecutableIntervalSchedule | ExecutableCronSchedule;
}

/**
 * sets default values
 *
 * @param momoJob
 */
export function toJob(momoJob: MomoJob): Job {
  return {
    concurrency: 1,
    maxRunning: 0,
    ...momoJob,
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
