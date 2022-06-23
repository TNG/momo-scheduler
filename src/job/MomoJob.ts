export type Handler = () => Promise<string | undefined | void> | string | undefined | void;

interface MomoBaseJob {
  handler: Handler;
  name: string;
  interval?: string;
  cronSchedule?: string;
  firstRunAfter?: number;
  concurrency?: number;
  maxRunning?: number;
}

export interface MomoCronJob extends MomoBaseJob {
  cronSchedule: string;
}

export function isMomoCronJob(input: MomoJob): input is MomoCronJob {
  return input.cronSchedule !== undefined;
}

export interface MomoIntervalJob extends MomoBaseJob {
  interval: string;
}

export function isMomoIntervalJob(input: MomoJob): input is MomoIntervalJob {
  return input.interval !== undefined;
}

export type MomoJob = MomoCronJob | MomoIntervalJob;
