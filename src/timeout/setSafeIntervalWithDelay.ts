import { setSafeInterval, setSafeTimeout } from './safeTimeouts';
import { Logger } from '../logging/Logger';

export interface TimeoutHandle {
  get: () => NodeJS.Timeout;
}

export function setSafeIntervalWithDelay(
  callback: () => Promise<void>,
  interval: number,
  delay: number,
  logger: Logger,
  errorMessage: string
): TimeoutHandle {
  const intervalWithDelay = new IntervalWithDelay(callback, interval, delay, logger, errorMessage);
  return { get: () => intervalWithDelay.timeout };
}

class IntervalWithDelay {
  public timeout: NodeJS.Timeout;

  constructor(callback: () => Promise<void>, interval: number, delay: number, logger: Logger, errorMessage: string) {
    this.timeout = setSafeTimeout(
      async () => {
        this.timeout = setSafeInterval(callback, interval, logger, errorMessage);
        await callback();
      },
      delay,
      logger,
      errorMessage
    );
  }
}
