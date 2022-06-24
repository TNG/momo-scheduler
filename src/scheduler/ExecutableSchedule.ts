import { TimeoutHandle } from '../timeout/setSafeIntervalWithDelay';
import { Logger } from '../logging/Logger';
import { CronSchedule, Interval, isInterval } from '../job/MomoJob';
import { ExecutableInterval } from './ExecutableInterval';
import { ExecutableCronSchedule } from './ExecutableCronSchedule';
import { ExecutionInfo } from '../job/ExecutionInfo';

export interface HandleResult {
  jobHandle: TimeoutHandle;
  delay: number;
}

export interface ExecutableSchedule<I> {
  execute: (callback: () => Promise<void>, logger: Logger, executionInfo?: ExecutionInfo) => HandleResult;
  toObject: () => I;
}

export function toExecutableSchedule(schedule: Interval | CronSchedule): ExecutableInterval | ExecutableCronSchedule {
  return isInterval(schedule) ? new ExecutableInterval(schedule) : new ExecutableCronSchedule(schedule);
}
