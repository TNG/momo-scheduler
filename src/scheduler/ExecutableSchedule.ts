import type { DateTime } from 'luxon';
import type { ExecutionInfo } from '../job/ExecutionInfo';
import type { ParsedIntervalSchedule } from '../job/Job';
import {
  type CronSchedule,
  isCronSchedule,
  type JobParameters,
} from '../job/MomoJob';
import type { Logger } from '../logging/Logger';
import { ExecutableCronSchedule } from './ExecutableCronSchedule';
import { ExecutableIntervalSchedule } from './ExecutableIntervalSchedule';

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
