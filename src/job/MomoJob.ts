import { JobEntity } from '../repository/JobEntity';

export type Handler = () => Promise<string | void> | string | void;

export interface MomoJob extends MomoJobDescription {
  immediate?: boolean;
  handler: Handler;
}

export interface MomoJobDescription {
  name: string;
  interval: string;
  concurrency?: number;
  maxRunning?: number;
}

export function jobDescriptionFromEntity(jobEntity: JobEntity): MomoJobDescription {
  const { name, interval, concurrency, maxRunning } = jobEntity;
  return { name, interval, concurrency, maxRunning };
}
