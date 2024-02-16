import { JobEntity } from './JobEntity';
import { CronSchedule, IntervalSchedule, toSchedule } from '../job/MomoJob';
import { ParsedIntervalSchedule } from '../job/Job';

export interface MomoJobStatus extends Omit<JobEntity, '_id' | 'schedule' | 'parameters'> {
  schedule: Required<IntervalSchedule> | CronSchedule;
}

export function toMomoJobStatus<Schedule extends ParsedIntervalSchedule | CronSchedule>({
  name,
  schedule,
  concurrency,
  maxRunning,
}: Omit<JobEntity<unknown, Schedule>, '_id'>): MomoJobStatus {
  return {
    name,
    schedule: toSchedule(schedule),
    concurrency,
    maxRunning,
  };
}
