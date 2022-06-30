import { ParsedIntervalSchedule } from './Job';

export type Handler = () => Promise<string | undefined | void> | string | undefined | void;

export interface MomoJob {
  handler: Handler;
  schedule: IntervalSchedule | CronSchedule;
  name: string;
  concurrency?: number;
  maxRunning?: number;
}

export interface IntervalSchedule {
  interval: string;
  firstRunAfter?: number | string;
}

export interface CronSchedule {
  cronSchedule: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isIntervalSchedule(input: any): input is IntervalSchedule {
  return (
    input.interval !== undefined &&
    typeof input.interval === 'string' &&
    (input.firstRunAfter === undefined ||
      typeof input.firstRunAfter === 'number' ||
      typeof input.firstRunAfter === 'string')
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isCronSchedule(input: any): input is CronSchedule {
  return input.cronSchedule !== undefined && typeof input.cronSchedule === 'string';
}

export function toSchedule(schedule: ParsedIntervalSchedule | CronSchedule): IntervalSchedule | CronSchedule {
  if (isCronSchedule(schedule)) {
    return schedule;
  }

  const { interval, firstRunAfter } = schedule;

  return { interval, firstRunAfter };
}
