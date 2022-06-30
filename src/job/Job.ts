import humanInterval from 'human-interval';

import { CronSchedule, Handler, IntervalSchedule, TypedMomoJob } from './MomoJob';
import { momoError } from '../logging/error/MomoError';

export interface ParsedIntervalSchedule extends Required<IntervalSchedule> {
  parsedInterval: number;
  parsedFirstRunAfter: number;
}

export interface JobDefinition<
  Schedule extends ParsedIntervalSchedule | CronSchedule = ParsedIntervalSchedule | CronSchedule
> {
  name: string;
  schedule: Schedule;
  concurrency: number;
  maxRunning: number;
}

export interface Job<Schedule extends ParsedIntervalSchedule | CronSchedule = ParsedIntervalSchedule | CronSchedule>
  extends JobDefinition<Schedule> {
  handler: Handler;
}

/**
 * sets default values
 *
 * @param momoJob
 */
export function toIntervalJob(momoJob: TypedMomoJob<IntervalSchedule>): Job<ParsedIntervalSchedule> {
  const firstRunAfter = momoJob.schedule.firstRunAfter ?? 0;
  const parsedFirstRunAfter = typeof firstRunAfter === 'number' ? firstRunAfter : humanInterval(firstRunAfter);
  if (parsedFirstRunAfter === undefined || isNaN(parsedFirstRunAfter)) {
    // firstRunAfter was already validated
    throw momoError.invalidFirstRunAfter;
  }

  const parsedInterval = humanInterval(momoJob.schedule.interval);
  if (parsedInterval === undefined || isNaN(parsedInterval)) {
    // parsedInterval was already validated
    throw momoError.nonParsableInterval;
  }
  const schedule = { interval: momoJob.schedule.interval, parsedInterval, firstRunAfter, parsedFirstRunAfter };

  return {
    concurrency: 1,
    maxRunning: 0,
    ...momoJob,
    schedule,
  };
}

/**
 * sets default values
 *
 * @param momoJob
 */
export function toCronJob(momoJob: TypedMomoJob<CronSchedule>): Job<CronSchedule> {
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
export function toJobDefinition<
  Schedule extends ParsedIntervalSchedule | CronSchedule,
  Type extends JobDefinition<Schedule>
>({ name, schedule, maxRunning, concurrency }: Type): JobDefinition<Schedule> {
  return { name, schedule, maxRunning, concurrency };
}
