export type Handler = () => Promise<string | undefined | void> | string | undefined | void;

interface MomoBaseJob {
  handler: Handler;
  name: string;
  concurrency?: number;
  maxRunning?: number;
}

export interface IntervalSchedule {
  interval: string;
  firstRunAfter: number;
}

export interface CronSchedule {
  cronSchedule: string;
}

export function isIntervalSchedule(input: unknown): input is IntervalSchedule {
  return (
    // @ts-ignore
    input.interval !== undefined &&
    // @ts-ignore
    input.firstRunAfter !== undefined &&
    typeof (input as IntervalSchedule).interval == 'string' &&
    typeof (input as IntervalSchedule).firstRunAfter == 'number'
  );
}

export function isCronSchedule(input: unknown): input is CronSchedule {
  return (
    // @ts-ignore
    input.cronSchedule !== undefined && typeof (input as CronSchedule).cronSchedule == 'string'
  );
}

export interface MomoIntervalJob extends MomoBaseJob {
  schedule: IntervalSchedule;
}

export function isMomoIntervalJob(input: unknown): input is MomoIntervalJob {
  return isIntervalSchedule((input as MomoIntervalJob).schedule);
}

export interface MomoCronJob extends MomoBaseJob {
  schedule: CronSchedule;
}

export function isMomoCronJob(input: MomoJob): input is MomoCronJob {
  return isCronSchedule((input as MomoIntervalJob).schedule);
}

export type MomoJob = MomoCronJob | MomoIntervalJob;
