import humanInterval from 'human-interval';
import { WithoutId } from 'mongodb';

import { CronSchedule, Handler, IntervalSchedule, MomoJob, isIntervalSchedule } from './MomoJob';
import { JobEntity } from '../repository/JobEntity';
import { momoError } from '../logging/error/MomoError';

export type MomoJobStatus = WithoutId<JobEntity>;

interface ParsedIntervalSchedule extends Required<IntervalSchedule> {
  parsedInterval: number;
}

export interface JobDefinition {
  name: string;
  schedule: ParsedIntervalSchedule | CronSchedule;
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
  let schedule: ParsedIntervalSchedule | CronSchedule;

  if (isIntervalSchedule(momoJob.schedule)) {
    const firstRunAfter =
      momoJob.firstRunAfter !== undefined
        ? typeof momoJob.firstRunAfter === 'number'
          ? momoJob.firstRunAfter
          : humanInterval(momoJob.firstRunAfter)
        : 0;
    if (firstRunAfter === undefined || isNaN(firstRunAfter)) {
      // firstRunAfter was already validated
      throw momoError.invalidFirstRunAfter;
    }

    const parsedInterval = humanInterval(momoJob.interval);
    if (parsedInterval === undefined || isNaN(parsedInterval)) {
      // parsedInterval was already validated
      throw momoError.nonParsableInterval;
    }
    schedule = { firstRunAfter, parsedInterval, interval: momoJob.schedule.interval };
  } else {
    schedule = momoJob.schedule;
  }

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
