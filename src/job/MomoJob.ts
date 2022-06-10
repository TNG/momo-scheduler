import { Handler } from './Job';

export interface MomoJob {
  handler: Handler;
  name: string;
  interval: string;
  firstRunAfter?: number;
  concurrency?: number;
  maxRunning?: number;
}
