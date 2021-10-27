import { Logger } from '../logging/Logger';
import { MomoErrorType } from '../logging/error/MomoErrorType';

export function setSafeTimeout(callback: () => void, ms: number, logger: Logger): NodeJS.Timeout {
  return setTimeout(() => {
    try {
      callback();
    } catch (e) {
      logger.error('setSafeTimeout - callback threw an error', MomoErrorType.internal, {}, e);
    }
  }, ms);
}

export function setSafeInterval(callback: () => void, interval: number, logger: Logger): NodeJS.Timeout {
  return setInterval(() => {
    try {
      callback();
    } catch (e) {
      logger.error('setSafeInterval - callback threw an error', MomoErrorType.internal, {}, e);
    }
  }, interval);
}
