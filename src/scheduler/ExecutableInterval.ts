import humanInterval from 'human-interval';
import { max } from 'lodash';
import { DateTime } from 'luxon';
import { Interval } from '../job/MomoJob';
import { momoError } from '../logging/error/MomoError';
import { setSafeIntervalWithDelay } from '../timeout/setSafeIntervalWithDelay';
import { Logger } from '../logging/Logger';
import { ExecutableSchedule, HandleResult } from './ExecutableSchedule';
import { ExecutionInfo } from '../job/ExecutionInfo';

export class ExecutableInterval implements ExecutableSchedule<Interval> {
  private readonly interval: string;
  private readonly firstRunAfter: number;

  constructor({ interval, firstRunAfter }: Interval) {
    this.interval = interval;
    this.firstRunAfter = firstRunAfter;
  }

  toObject(): Interval {
    return { interval: this.interval, firstRunAfter: this.firstRunAfter };
  }

  execute(callback: () => Promise<void>, logger: Logger, executionInfo?: ExecutionInfo): HandleResult {
    const interval = this.parse();
    const delay = this.calculateDelay(interval, executionInfo);

    return {
      jobHandle: setSafeIntervalWithDelay(callback, interval, delay, logger, 'Concurrent execution failed'),
      delay,
    };
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
