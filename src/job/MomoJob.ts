import { ParsedIntervalSchedule } from './Job';

export type Handler = () => Promise<string | undefined | void> | string | undefined | void;

export interface TypedMomoJob<Schedule> {
  handler: Handler;
  schedule: Schedule;
  name: string;
  concurrency?: number;
  maxRunning?: number;
}

export type MomoJob = TypedMomoJob<IntervalSchedule> | TypedMomoJob<CronSchedule>;

export interface IntervalSchedule {
  interval: number | string;
  firstRunAfter?: number | string;
}

export interface CronSchedule {
  cronSchedule: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isCronSchedule(input: any): input is CronSchedule {
  return input.cronSchedule !== undefined && typeof input.cronSchedule === 'string';
}

/**
 * removes properties that are not part of the IntervalSchedule resp. CronSchedule interface
 *
 * @param schedule
 */
export function toSchedule(schedule: ParsedIntervalSchedule | CronSchedule): Required<IntervalSchedule> | CronSchedule {
  if (isCronSchedule(schedule)) {
    return schedule;
  }

  const { interval, firstRunAfter } = schedule;

  return { interval, firstRunAfter };
}

export function isCronJob(momoJob: MomoJob): momoJob is TypedMomoJob<CronSchedule> {
  return isCronSchedule(momoJob.schedule);
}
