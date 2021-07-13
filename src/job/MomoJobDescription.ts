import { JobEntity } from '../repository/JobEntity';

export interface SchedulerStatus {
  interval: string;
  running: number;
}

export interface MomoJobDescription {
  name: string;
  interval: string;
  concurrency: number;
  maxRunning: number;
  schedulerStatus?: SchedulerStatus;
}

export function jobDescriptionFromEntity(jobEntity: JobEntity): MomoJobDescription {
  const { name, interval, concurrency, maxRunning } = jobEntity;
  return { name, interval, concurrency, maxRunning };
}
