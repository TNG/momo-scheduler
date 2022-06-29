import { DateTime } from 'luxon';
import { Logger } from '../logging/Logger';
import { CronSchedule, IntervalSchedule, isIntervalSchedule } from '../job/MomoJob';
import { ExecutableIntervalSchedule } from './ExecutableIntervalSchedule';
import { ExecutableCronSchedule } from './ExecutableCronSchedule';
import { ExecutionInfo } from '../job/ExecutionInfo';

export interface NextExecutionTime {
  nextExecution: DateTime;
}

export interface ExecutableSchedule<I> {
  execute: (callback: () => Promise<void>, logger: Logger, executionInfo?: ExecutionInfo) => NextExecutionTime;
  stop: () => void;
  isStarted: () => boolean;
  toObject: () => I;
}

export function toExecutableSchedule(
  schedule: IntervalSchedule | CronSchedule
): ExecutableIntervalSchedule | ExecutableCronSchedule {
  return isIntervalSchedule(schedule) ? new ExecutableIntervalSchedule(schedule) : new ExecutableCronSchedule(schedule);
}
