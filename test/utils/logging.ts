import Pino from 'pino';
import TypedEmitter from 'typed-emitter';

import { Logger } from '../../src/logging/Logger';
import { MomoErrorType } from '../../src';
import { MomoEventData, MomoEvents } from '../../src/logging/MomoEvents';

const logger = Pino();
const errorLogger = Pino({ level: 'error' });

export function initLoggingForTests(eventEmitter: TypedEmitter<MomoEvents>): void {
  eventEmitter.on('debug', (event) => {
    logger.info(event);
  });
  eventEmitter.on('error', (event) => {
    errorLogger.error(event);
  });
}

export function loggerForTests(
  errorFn?: (message: string, type: MomoErrorType, data?: MomoEventData, error?: unknown) => void,
): Logger {
  return {
    debug: (message, data) => logger.info({ message, data }),
    error: (message, type, data, error) => {
      errorLogger.error({ message, type, data, error });
      if (errorFn) errorFn(message, type, data, error);
    },
  };
}
