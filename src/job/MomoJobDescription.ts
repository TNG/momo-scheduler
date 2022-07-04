import { JobEntity } from '../repository/JobEntity';
import { CronSchedule, IntervalSchedule, toSchedule } from './MomoJob';

/**
 * information about scheduled job
 *
 * interval: the time interval at which job execution is triggered;
 * running: the number of currently running executions
 */
export interface JobSchedulerStatus {
  schedule: IntervalSchedule | CronSchedule;
  running: number;
}

export interface MomoJobDescription {
  name: string;
  schedule: IntervalSchedule | CronSchedule;
  concurrency: number;
  maxRunning: number;
  /** present only if the job is started */
  schedulerStatus?: JobSchedulerStatus;
}

export function toMomoJobDescription({ name, schedule, concurrency, maxRunning }: JobEntity): MomoJobDescription {
  return {
    name,
    schedule: toSchedule(schedule),
    concurrency,
    maxRunning,
  };
}
