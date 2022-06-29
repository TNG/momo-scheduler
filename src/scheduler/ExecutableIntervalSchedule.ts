import humanInterval from 'human-interval';
import { max } from 'lodash';
import { DateTime } from 'luxon';
import { IntervalSchedule } from '../job/MomoJob';
import { momoError } from '../logging/error/MomoError';
import { TimeoutHandle, setSafeIntervalWithDelay } from '../timeout/setSafeIntervalWithDelay';
import { Logger } from '../logging/Logger';
import { ExecutableSchedule, NextExecutionTime } from './ExecutableSchedule';
import { ExecutionInfo } from '../job/ExecutionInfo';

export class ExecutableIntervalSchedule implements ExecutableSchedule<Required<IntervalSchedule>> {
  private readonly interval: string;
  private readonly firstRunAfter: number;
  private timeoutHandle?: TimeoutHandle;

  constructor({ interval, firstRunAfter }: Required<IntervalSchedule>) {
    this.interval = interval;
    this.firstRunAfter = firstRunAfter;
  }

  toObject(): Required<IntervalSchedule> {
    return { interval: this.interval, firstRunAfter: this.firstRunAfter };
  }

  execute(callback: () => Promise<void>, logger: Logger, executionInfo?: ExecutionInfo): NextExecutionTime {
    const interval = this.parse();
    const delay = this.calculateDelay(interval, executionInfo);

    this.timeoutHandle = setSafeIntervalWithDelay(callback, interval, delay, logger, 'Concurrent execution failed');

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

  private calculateDelay(interval: number, executionInfo: ExecutionInfo | undefined): number {
    const lastStarted = executionInfo?.lastStarted;
    const lastStartedDateTime = lastStarted !== undefined ? DateTime.fromISO(lastStarted) : undefined;
    const nextStart = lastStartedDateTime?.plus({ milliseconds: interval }).toMillis();

    if (nextStart === undefined) {
      return this.firstRunAfter;
    }

    return max([nextStart - DateTime.now().toMillis(), 0]) ?? 0;
  }

  private parse(): number {
    const parsedInterval = humanInterval(this.interval);
    if (parsedInterval === undefined || isNaN(parsedInterval)) {
      // the interval was already validated when the job was defined
      throw momoError.nonParsableInterval;
    }
    return parsedInterval;
  }
}
