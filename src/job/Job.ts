import humanInterval from 'human-interval';
import { Result, err, ok } from 'neverthrow';
import CronExpressionParser from 'cron-parser';

import {
  CronSchedule,
  Handler,
  IntervalSchedule,
  JobParameters,
  MomoJob,
  NeverSchedule,
  TypedMomoJob,
  isCronJob,
  isNeverJob,
} from './MomoJob';
import { momoError } from '../logging/error/MomoError';

export const maxNodeTimeoutDelay = 2147483647;
export const maxJobTimeout = maxNodeTimeoutDelay;

export interface ParsedIntervalSchedule extends Required<IntervalSchedule> {
  parsedInterval: number;
  parsedFirstRunAfter: number;
}

export interface JobDefinition<JobSchedule = ParsedIntervalSchedule | CronSchedule | NeverSchedule> {
  name: string;
  schedule: JobSchedule;
  concurrency: number;
  maxRunning: number;
  timeout?: number;
  parameters?: JobParameters;
}

export interface Job<Schedule = ParsedIntervalSchedule | CronSchedule | NeverSchedule> extends JobDefinition<Schedule> {
  handler: Handler;
}

/**
 * This validates all fields and sets defaults for not defined optional fields.
 *
 * @param momoJob to be verified and converted into a `Job`
 */
export function tryToJob(momoJob: MomoJob): Result<Job, Error> {
  const { concurrency, maxRunning, timeout } = momoJob;
  if (maxRunning !== undefined && maxRunning < 0) {
    return err(momoError.invalidMaxRunning);
  }
  if (concurrency !== undefined && concurrency < 1) {
    return err(momoError.invalidConcurrency);
  }
  if (maxRunning !== undefined && maxRunning > 0 && concurrency !== undefined && concurrency > maxRunning) {
    return err(momoError.invalidConcurrency);
  }
  if (timeout !== undefined && (timeout > maxJobTimeout || timeout < 1)) {
    return err(momoError.invalidTimeout);
  }

  return isNeverJob(momoJob)
    ? tryToNeverJob(momoJob)
    : isCronJob(momoJob)
      ? tryToCronJob(momoJob)
      : tryToIntervalJob(momoJob);
}

export function tryToNeverJob(momoJob: TypedMomoJob<NeverSchedule>): Result<Job<NeverSchedule>, Error> {
  try {
    return ok({
      concurrency: 1,
      maxRunning: 0,
      ...momoJob,
    });
  } catch {
    // TODO: Figure out what errors might actually occur here
    return err(momoError.nonParsableCronSchedule);
  }
}

/**
 * This validates all fields and sets defaults for not defined optional fields.
 *
 * @param momoJob to be verified and converted into a `Job`
 */
export function tryToCronJob(momoJob: TypedMomoJob<CronSchedule>): Result<Job<CronSchedule>, Error> {
  try {
    CronExpressionParser.parse(momoJob.schedule.cronSchedule);

    return ok({
      concurrency: 1,
      maxRunning: 0,
      ...momoJob,
    });
  } catch {
    return err(momoError.nonParsableCronSchedule);
  }
}

/**
 * This validates all fields and sets defaults for not defined optional fields.
 *
 * @param momoJob to be verified and converted into a `Job`
 */
export function tryToIntervalJob(momoJob: TypedMomoJob<IntervalSchedule>): Result<Job<ParsedIntervalSchedule>, Error> {
  const { interval, firstRunAfter } = momoJob.schedule;
  const parsedInterval = typeof interval === 'number' ? interval : humanInterval(interval);
  const parsedFirstRunAfter = typeof firstRunAfter === 'number' ? firstRunAfter : humanInterval(firstRunAfter);

  if (typeof parsedInterval !== 'number' || isNaN(parsedInterval)) {
    return err(momoError.nonParsableInterval);
  } else if (parsedInterval <= 0 || parsedInterval > maxNodeTimeoutDelay) {
    return err(momoError.invalidInterval);
  }
  if (firstRunAfter !== undefined) {
    if (typeof parsedFirstRunAfter !== 'number' || isNaN(parsedFirstRunAfter)) {
      return err(momoError.nonParsableFirstRunAfter);
    } else if ((parsedFirstRunAfter < 0 && parsedFirstRunAfter !== -1) || parsedFirstRunAfter > maxNodeTimeoutDelay) {
      return err(momoError.invalidFirstRunAfter);
    }
  }

  const schedule = {
    interval: momoJob.schedule.interval,
    parsedInterval,
    firstRunAfter: firstRunAfter ?? 0,
    parsedFirstRunAfter: parsedFirstRunAfter ?? 0,
  };
  return ok({
    concurrency: 1,
    maxRunning: 0,
    ...momoJob,
    schedule,
  });
}

/**
 * removes properties that are not part of the JobDefinition interface
 *
 * @param job
 */
export function toJobDefinition<
  Schedule extends ParsedIntervalSchedule | CronSchedule | NeverSchedule,
  Type extends JobDefinition<Schedule>,
>({ name, schedule, maxRunning, concurrency, timeout, parameters }: Type): JobDefinition<Schedule> {
  return { name, schedule, maxRunning, concurrency, timeout, parameters };
}
