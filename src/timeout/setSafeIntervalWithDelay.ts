import { setSafeInterval, setSafeTimeout } from './safeTimeouts';
import { Logger } from '../logging/Logger';

export interface TimeoutHandle {
  get: () => NodeJS.Timeout;
}

export function setSafeIntervalWithDelay(
  callback: () => Promise<void>,
  interval: number,
  delay: number,
  logger: Logger
): TimeoutHandle {
  const intervalWithDelay = new IntervalWithDelay(callback, interval, delay, logger);
  return { get: () => intervalWithDelay.timeout };
}

class IntervalWithDelay {
  public timeout: NodeJS.Timeout;

  constructor(callback: () => Promise<void>, interval: number, delay: number, logger: Logger) {
    this.timeout = setSafeTimeout(
      async () => {
        await callback();
        this.timeout = setSafeInterval(callback, interval, logger);
      },
      delay,
      logger
    );
  }
}
