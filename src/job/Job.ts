import { ExecutionInfo } from './ExecutionInfo';
import { Handler } from './MomoJob';

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
