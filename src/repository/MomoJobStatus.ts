import { JobEntity } from './JobEntity';
import { CronSchedule, IntervalSchedule, NeverSchedule, toSchedule } from '../job/MomoJob';
import { ParsedIntervalSchedule } from '../job/Job';

export interface MomoJobStatus extends Omit<JobEntity<never>, '_id' | 'schedule'> {
  schedule: Required<IntervalSchedule> | CronSchedule | NeverSchedule;
}

export function toMomoJobStatus<Schedule extends ParsedIntervalSchedule | CronSchedule | NeverSchedule>({
  name,
  schedule,
  concurrency,
  maxRunning,
}: Omit<JobEntity<Schedule>, '_id'>): MomoJobStatus {
  return {
    name,
    schedule: toSchedule(schedule),
    concurrency,
    maxRunning,
  };
}
