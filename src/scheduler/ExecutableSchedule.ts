import type { DateTime } from 'luxon';
import type { ExecutionInfo } from '../job/ExecutionInfo.js';
import type { ParsedIntervalSchedule } from '../job/Job.js';
import {
  type CronSchedule,
  isCronSchedule,
  type JobParameters,
} from '../job/MomoJob.js';
import type { Logger } from '../logging/Logger.js';
import { ExecutableCronSchedule } from './ExecutableCronSchedule.js';
import { ExecutableIntervalSchedule } from './ExecutableIntervalSchedule.js';

export interface NextExecutionTime {
  nextExecution: DateTime;
}

export interface ExecutionParameters {
  callback: (parameters?: JobParameters) => Promise<void>;
  logger: Logger;
  errorMessage: string;
  jobParameters?: JobParameters;
  executionInfo?: ExecutionInfo;
}

export interface ExecutableSchedule<I> {
  execute: (executionParameters: ExecutionParameters) => NextExecutionTime;
  stop: () => Promise<void>;
  isStarted: () => boolean;
  toObject: () => I;
}

export function toExecutableSchedule(
  schedule: ParsedIntervalSchedule | CronSchedule,
): ExecutableIntervalSchedule | ExecutableCronSchedule {
  return isCronSchedule(schedule)
    ? new ExecutableCronSchedule(schedule)
    : new ExecutableIntervalSchedule(schedule);
}
