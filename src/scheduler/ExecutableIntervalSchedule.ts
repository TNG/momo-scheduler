import { max } from 'lodash';
import { DateTime } from 'luxon';

import { TimeoutHandle, setSafeIntervalWithDelay } from '../timeout/setSafeIntervalWithDelay';
import { Logger } from '../logging/Logger';
import { ExecutableSchedule, NextExecutionTime } from './ExecutableSchedule';
import { ExecutionInfo } from '../job/ExecutionInfo';
import { ParsedIntervalSchedule } from '../job/Job';
import { IntervalSchedule } from '../job/MomoJob';

export class ExecutableIntervalSchedule implements ExecutableSchedule<Required<IntervalSchedule>> {
  private readonly interval: number | string;
  private readonly parsedInterval: number;
  private readonly firstRunAfter: number | string;
  private readonly parsedFirstRunAfter: number;
  private timeoutHandle?: TimeoutHandle;

  constructor({ interval, parsedInterval, firstRunAfter, parsedFirstRunAfter }: ParsedIntervalSchedule) {
    this.interval = interval;
    this.parsedInterval = parsedInterval;
    this.firstRunAfter = firstRunAfter;
    this.parsedFirstRunAfter = parsedFirstRunAfter;
  }

  toObject(): Required<IntervalSchedule> {
    return {
      interval: this.interval,
      firstRunAfter: this.firstRunAfter,
    };
  }

  execute(
    callback: () => Promise<void>,
    logger: Logger,
    errorMessage: string,
    executionInfo?: ExecutionInfo
  ): NextExecutionTime {
    const delay = this.calculateDelay(executionInfo);

    this.timeoutHandle = setSafeIntervalWithDelay(callback, this.parsedInterval, delay, logger, errorMessage);

    return { nextExecution: DateTime.fromMillis(DateTime.now().toMillis() + delay) };
  }

  isStarted(): boolean {
    return !!this.timeoutHandle;
  }

  stop(): void {
    if (this.timeoutHandle) {
      clearTimeout(this.timeoutHandle.get());
      this.timeoutHandle = undefined;
    }
  }

  private calculateDelay(executionInfo: ExecutionInfo | undefined): number {
    const lastStarted = executionInfo?.lastStarted;
    const lastStartedDateTime = lastStarted !== undefined ? DateTime.fromISO(lastStarted) : undefined;
    const nextStart = lastStartedDateTime?.plus({ milliseconds: this.parsedInterval }).toMillis();

    if (nextStart === undefined) {
      return this.parsedFirstRunAfter;
    }

    return max([nextStart - DateTime.now().toMillis(), 0]) ?? 0;
  }
}
