import { JobEntity } from '../repository/JobEntity';
import { CronSchedule, IntervalSchedule, JobParameters, NeverSchedule, toSchedule } from './MomoJob';

/**
 * information about scheduled job
 *
 * interval: the time interval at which job execution is triggered;
 * running: the number of currently running executions
 */
export interface JobSchedulerStatus {
  schedule: IntervalSchedule | CronSchedule | NeverSchedule;
  running: number;
}

export interface MomoJobDescription {
  name: string;
  schedule: IntervalSchedule | CronSchedule | NeverSchedule;
  concurrency: number;
  maxRunning: number;
  parameters?: JobParameters;
  /** present only if the job is started */
  schedulerStatus?: JobSchedulerStatus;
}

export function toMomoJobDescription({
  name,
  schedule,
  concurrency,
  maxRunning,
  parameters,
}: JobEntity): MomoJobDescription {
  return {
    name,
    schedule: toSchedule(schedule),
    concurrency,
    maxRunning,
    parameters,
  };
}
