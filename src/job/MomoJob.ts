export type Handler = () => Promise<string | void> | string | void;

export interface MomoJob {
  name: string;
  interval: string;
  immediate?: boolean;
  concurrency?: number;
  maxRunning?: number;
  handler: Handler;
}
