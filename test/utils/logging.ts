import Pino from 'pino';
import type TypedEmitter from 'typed-emitter';
import type { MomoErrorType } from '../../src';
import type { Logger } from '../../src/logging/Logger';
import type { MomoEventData, MomoEvents } from '../../src/logging/MomoEvents';

const logger = Pino();
const errorLogger = Pino({ level: 'error' });

export function initLoggingForTests(
  eventEmitter: TypedEmitter<MomoEvents>,
): void {
  eventEmitter.on('debug', (event) => {
    logger.info(event);
  });
  eventEmitter.on('error', (event) => {
    errorLogger.error(event);
  });
}

export function loggerForTests(
  errorFn?: (
    message: string,
    type: MomoErrorType,
    data?: MomoEventData,
    error?: unknown,
  ) => void,
  debugFn?: (message: string, data?: MomoEventData) => void,
): Logger {
  return {
    debug: (message, data) => {
      logger.info({ message, data });
      if (debugFn) {
        debugFn(message, data);
      }
    },
    error: (message, type, data, error) => {
      errorLogger.error({ message, type, data, error });
      if (errorFn) {
        if (error !== undefined) {
          errorFn(message, type, data, error);
        } else {
          errorFn(message, type, data);
        }
      }
    },
  };
}
