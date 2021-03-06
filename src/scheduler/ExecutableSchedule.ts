import { DateTime } from 'luxon';

import { Logger } from '../logging/Logger';
import { CronSchedule, isCronSchedule } from '../job/MomoJob';
import { ExecutableIntervalSchedule } from './ExecutableIntervalSchedule';
import { ExecutableCronSchedule } from './ExecutableCronSchedule';
import { ExecutionInfo } from '../job/ExecutionInfo';
import { ParsedIntervalSchedule } from '../job/Job';

export interface NextExecutionTime {
  nextExecution: DateTime;
}

export interface ExecutableSchedule<I> {
  execute: (
    callback: () => Promise<void>,
    logger: Logger,
    errorMessage: string,
    executionInfo?: ExecutionInfo
  ) => NextExecutionTime;
  stop: () => void;
  isStarted: () => boolean;
  toObject: () => I;
}

export function toExecutableSchedule(
  schedule: ParsedIntervalSchedule | CronSchedule
): ExecutableIntervalSchedule | ExecutableCronSchedule {
  return isCronSchedule(schedule) ? new ExecutableCronSchedule(schedule) : new ExecutableIntervalSchedule(schedule);
}
