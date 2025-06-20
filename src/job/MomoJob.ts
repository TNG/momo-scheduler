import { ParsedIntervalSchedule } from './Job';

export type JobParameters = Record<string, object | number | string | boolean | undefined>;

export type Handler = (parameters?: JobParameters) => Promise<string | undefined | void> | string | undefined | void;

export interface TypedMomoJob<Schedule> {
  handler: Handler;
  schedule: Schedule;
  name: string;
  concurrency?: number;
  maxRunning?: number;
  timeout?: number;
  parameters?: JobParameters;
}

export type MomoJob = TypedMomoJob<IntervalSchedule> | TypedMomoJob<CronSchedule> | TypedMomoJob<NeverSchedule>;

export interface IntervalSchedule {
  interval: number | string;
  firstRunAfter?: number | string;
}

export interface CronSchedule {
  cronSchedule: string;
}

export interface NeverSchedule {
  noAutomaticRuns: true;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isCronSchedule(input: any): input is CronSchedule {
  return input.cronSchedule !== undefined && typeof input.cronSchedule === 'string';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isNeverSchedule(input: any): input is NeverSchedule {
  const result = input.noAutomaticRuns !== undefined && input.noAutomaticRuns === true;
  return result;
}

/**
 * removes properties that are not part of the NeverSchedule, IntervalSchedule, or CronSchedule interfaces
 *
 * @param schedule
 */
export function toSchedule(
  schedule: ParsedIntervalSchedule | CronSchedule | NeverSchedule,
): Required<IntervalSchedule> | CronSchedule | NeverSchedule {
  if (isNeverSchedule(schedule) || isCronSchedule(schedule)) {
    return schedule;
  }

  const { interval, firstRunAfter } = schedule;

  return { interval, firstRunAfter };
}

export function isNeverJob(momoJob: MomoJob): momoJob is TypedMomoJob<NeverSchedule> {
  const result = isNeverSchedule(momoJob.schedule);
  return result;
}

export function isCronJob(momoJob: MomoJob): momoJob is TypedMomoJob<CronSchedule> {
  return isCronSchedule(momoJob.schedule);
}
