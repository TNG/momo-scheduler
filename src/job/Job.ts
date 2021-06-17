import { Handler } from './MomoJob';
import { ExecutionInfo } from './ExecutionInfo';

export type MomoJobStatus = JobDefinition & { executionInfo?: ExecutionInfo };

export interface JobDefinition {
  name: string;
  interval: string;
  concurrency: number;
  maxRunning: number;
}

export interface Job extends JobDefinition {
  immediate: boolean;
  handler: Handler;
}
