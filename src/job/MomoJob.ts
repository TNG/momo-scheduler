export type Handler = () => Promise<string | undefined | void> | string | undefined | void;

export interface MomoJob {
  immediate?: boolean;
  handler: Handler;
  name: string;
  interval: string;
  concurrency?: number;
  maxRunning?: number;
}
