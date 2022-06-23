export type Handler = () => Promise<string | undefined | void> | string | undefined | void;

interface MomoBaseJob {
  handler: Handler;
  name: string;
  concurrency?: number;
  maxRunning?: number;
}

export interface Interval {
  interval: string;
  firstRunAfter: number;
}

export interface CronSchedule {
  cronSchedule: string;
}

export function isInterval(input: unknown): input is Interval {
  return (
    // @ts-ignore
    input.interval !== undefined &&
    // @ts-ignore
    input.firstRunAfter !== undefined &&
    typeof (input as Interval).interval == 'string' &&
    typeof (input as Interval).firstRunAfter == 'number'
  );
}

export function isCronSchedule(input: unknown): input is CronSchedule {
  return (
    // @ts-ignore
    input.cronSchedule !== undefined && typeof (input as CronSchedule).cronSchedule == 'string'
  );
}

export interface MomoIntervalJob extends MomoBaseJob {
  schedule: Interval;
}

export function isMomoIntervalJob(input: unknown): input is MomoIntervalJob {
  return isInterval((input as MomoIntervalJob).schedule);
}

export interface MomoCronJob extends MomoBaseJob {
  schedule: CronSchedule;
}

export function isMomoCronJob(input: MomoJob): input is MomoCronJob {
  return isCronSchedule((input as MomoIntervalJob).schedule);
}

export type MomoJob = MomoCronJob | MomoIntervalJob;
