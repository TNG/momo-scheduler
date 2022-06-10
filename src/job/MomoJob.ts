export type Handler = () => Promise<string | undefined | void> | string | undefined | void;

export interface MomoJob {
  handler: Handler;
  name: string;
  interval: string;
  firstRunAfter?: number | string;
  concurrency?: number;
  maxRunning?: number;
}
