export interface TimeoutHandle {
  get: () => NodeJS.Timeout;
}

export function setIntervalWithDelay(callback: () => unknown, interval: number, delay: number): TimeoutHandle {
  const intervalWithDelay = new IntervalWithDelay(callback, interval, delay);
  return { get: () => intervalWithDelay.timeout };
}

class IntervalWithDelay {
  public timeout: NodeJS.Timeout;

  constructor(callback: () => void, interval: number, delay: number) {
    this.timeout = setTimeout(() => {
      callback();
      this.timeout = setInterval(callback, interval);
    }, delay);
  }
}
