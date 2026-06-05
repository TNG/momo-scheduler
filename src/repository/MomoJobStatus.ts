import type { ParsedIntervalSchedule } from '../job/Job.js';
import {
  type CronSchedule,
  type IntervalSchedule,
  type NeverSchedule,
  toSchedule,
} from '../job/MomoJob.js';
import type { JobEntity } from './JobEntity.js';

export interface MomoJobStatus
  extends Omit<JobEntity<never>, '_id' | 'schedule'> {
  schedule: Required<IntervalSchedule> | CronSchedule | NeverSchedule;
}

export function toMomoJobStatus<
  Schedule extends ParsedIntervalSchedule | CronSchedule | NeverSchedule,
>({
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
