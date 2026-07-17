import { MomoErrorType } from '../logging/error/MomoErrorType.js';
import type { Logger } from '../logging/Logger.js';

export function setSafeTimeout(
  callback: () => Promise<void>,
  ms: number,
  logger: Logger,
  errorMessage: string,
): NodeJS.Timeout {
  return setTimeout(async () => {
    try {
      await callback();
    } catch (e) {
      logger.error(errorMessage, MomoErrorType.internal, {}, e);
    }
  }, ms);
}

export function setSafeInterval(
  callback: () => Promise<void>,
  interval: number,
  logger: Logger,
  errorMessage: string,
): NodeJS.Timeout {
  return setInterval(async () => {
    try {
      await callback();
    } catch (e) {
      logger.error(errorMessage, MomoErrorType.internal, {}, e);
    }
  }, interval);
}
