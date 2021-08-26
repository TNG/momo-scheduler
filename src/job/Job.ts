import { Handler, MomoJob } from './MomoJob';
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

export function fromMomoJob(job: MomoJob): Job {
  return { immediate: false, concurrency: 1, maxRunning: 0, ...job };
}
