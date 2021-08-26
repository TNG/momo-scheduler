import { Handler } from './MomoJob';
import { WithoutId } from 'mongodb';
import { JobEntity } from '../repository/JobEntity';

export type MomoJobStatus = WithoutId<JobEntity>;

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
