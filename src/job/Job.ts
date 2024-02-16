import humanInterval from 'human-interval';
import { Result, err, ok } from 'neverthrow';
import { parseExpression } from 'cron-parser';

import { CronSchedule, Handler, IntervalSchedule, MomoJob, TypedMomoJob, isCronJob } from './MomoJob';
import { momoError } from '../logging/error/MomoError';

export interface ParsedIntervalSchedule extends Required<IntervalSchedule> {
  parsedInterval: number;
  parsedFirstRunAfter: number;
}

export interface JobDefinition<JobParams, JobSchedule = ParsedIntervalSchedule | CronSchedule> {
  name: string;
  schedule: JobSchedule;
  concurrency: number;
  maxRunning: number;
  parameters?: JobParams;
}

export interface Job<Schedule = ParsedIntervalSchedule | CronSchedule, JobParams = unknown>
  extends JobDefinition<JobParams, Schedule> {
  handler: Handler<JobParams>;
}

/**
 * This validates all fields and sets defaults for not defined optional fields.
 *
 * @param momoJob to be verified and converted into a `Job`
 */
export function tryToJob<JobParams>(
  momoJob: MomoJob<JobParams>,
): Result<Job<ParsedIntervalSchedule | CronSchedule, JobParams>, Error> {
  const { concurrency, maxRunning } = momoJob;
  if (maxRunning !== undefined && maxRunning < 0) {
    return err(momoError.invalidMaxRunning);
  }
  if (concurrency !== undefined && concurrency < 1) {
    return err(momoError.invalidConcurrency);
  }
  if (maxRunning !== undefined && maxRunning > 0 && concurrency !== undefined && concurrency > maxRunning) {
    return err(momoError.invalidConcurrency);
  }

  return isCronJob(momoJob) ? tryToCronJob(momoJob) : tryToIntervalJob(momoJob);
}

/**
 * This validates all fields and sets defaults for not defined optional fields.
 *
 * @param momoJob to be verified and converted into a `Job`
 */
export function tryToIntervalJob<JobParams>(
  momoJob: TypedMomoJob<JobParams, IntervalSchedule>,
): Result<Job<ParsedIntervalSchedule, JobParams>, Error> {
  const { interval, firstRunAfter } = momoJob.schedule;
  const parsedInterval = typeof interval === 'number' ? interval : humanInterval(interval);
  const parsedFirstRunAfter = typeof firstRunAfter === 'number' ? firstRunAfter : humanInterval(firstRunAfter);

  if (typeof parsedInterval !== 'number' || isNaN(parsedInterval)) {
    return err(momoError.nonParsableInterval);
  } else if (parsedInterval <= 0) {
    return err(momoError.invalidInterval);
  }
  if (firstRunAfter !== undefined) {
    if (typeof parsedFirstRunAfter !== 'number' || isNaN(parsedFirstRunAfter)) {
      return err(momoError.nonParsableFirstRunAfter);
    } else if (parsedFirstRunAfter < 0) {
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
 * This validates all fields and sets defaults for not defined optional fields.
 *
 * @param momoJob to be verified and converted into a `Job`
 */
export function tryToCronJob<JobParams>(
  momoJob: TypedMomoJob<JobParams, CronSchedule>,
): Result<Job<CronSchedule, JobParams>, Error> {
  try {
    parseExpression(momoJob.schedule.cronSchedule);

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
 * removes properties that are not part of the JobDefinition interface
 *
 * @param job
 */
export function toJobDefinition<
  JobParams,
  Schedule extends ParsedIntervalSchedule | CronSchedule,
  Type extends JobDefinition<JobParams, Schedule>,
>({ name, schedule, maxRunning, concurrency, parameters }: Type): JobDefinition<JobParams, Schedule> {
  return { name, schedule, maxRunning, concurrency, parameters };
}
