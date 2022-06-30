import { JobEntity } from './JobEntity';
import { CronSchedule, IntervalSchedule, isIntervalSchedule } from '../job/MomoJob';

export interface MomoJobStatus extends Omit<JobEntity, '_id' | 'schedule'> {
  schedule: Required<IntervalSchedule> | CronSchedule;
}

export function toMomoJobStatus<T extends MomoJobStatus>({
  name,
  schedule,
  concurrency,
  maxRunning,
}: T): MomoJobStatus {
  return {
    name,
    schedule: isIntervalSchedule(schedule)
      ? { interval: schedule.interval, firstRunAfter: schedule.firstRunAfter }
      : schedule,
    concurrency,
    maxRunning,
  };
}
