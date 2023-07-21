import { Logger } from '../logging/Logger';
import { MomoErrorType } from '../logging/error/MomoErrorType';

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
