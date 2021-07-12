export type Handler = () => Promise<string | void> | string | void;

export interface MomoJob {
  immediate?: boolean;
  handler: Handler;
  name: string;
  interval: string;
  concurrency?: number;
  maxRunning?: number;
}
