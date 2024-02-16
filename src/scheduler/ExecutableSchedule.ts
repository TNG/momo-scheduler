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

export interface ExecutionParameters<JobParams> {
  callback: (parameters?: JobParams) => Promise<void>;
  logger: Logger;
  errorMessage: string;
  jobParameters?: JobParams;
  executionInfo?: ExecutionInfo;
}

export interface ExecutableSchedule<JobParams, ScheduleType> {
  execute: (executionParameters: ExecutionParameters<JobParams>) => NextExecutionTime;
  stop: () => void;
  isStarted: () => boolean;
  toObject: () => ScheduleType;
}

export function toExecutableSchedule<JobParams>(
  schedule: ParsedIntervalSchedule | CronSchedule,
): ExecutableIntervalSchedule<JobParams> | ExecutableCronSchedule<JobParams> {
  return isCronSchedule(schedule) ? new ExecutableCronSchedule(schedule) : new ExecutableIntervalSchedule(schedule);
}
