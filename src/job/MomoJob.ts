import { ParsedIntervalSchedule } from './Job';

export type JobParameters = Record<string, object | number | string | boolean | undefined>;

// biome-ignore lint/suspicious/noConfusingVoidType: we want to explicitly allow it here, so users have more freedom
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
  interval: 'Never' | 'never';
}


export function isCronSchedule(input: unknown): input is CronSchedule {
  if (typeof input !== 'object') return false;

  const schedule = input as Partial<CronSchedule>;
  return schedule.cronSchedule !== undefined && typeof schedule.cronSchedule === 'string';
}

export function isNeverSchedule(input: unknown): input is NeverSchedule {
  if (typeof input !== 'object') return false;

  const schedule = input as Partial<NeverSchedule>;
  return schedule.interval !== undefined && ['Never', 'never'].includes(schedule.interval);
}

/**
 * removes properties that are not part of the IntervalSchedule resp. CronSchedule interface
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

export function isCronJob(momoJob: MomoJob): momoJob is TypedMomoJob<CronSchedule> {
  return isCronSchedule(momoJob.schedule);
}

export function isNeverJob(momoJob: MomoJob): momoJob is TypedMomoJob<NeverSchedule> {
  return isNeverSchedule(momoJob.schedule);
}
