import TypedEmitter from 'typed-emitter';
import Pino from 'pino';
import { MomoEventData, MomoEvents } from '../../src/logging/MomoEvents';
import { Logger } from '../../src/logging/Logger';
import { MomoErrorType } from '../../src';

const logger = Pino();
const errorLogger = Pino({ level: 'error' });

export function initLoggingForTests(eventEmitter: TypedEmitter<MomoEvents>) {
  eventEmitter.on('debug', (event) => {
    logger.info(event);
  });
  eventEmitter.on('error', (event) => {
    errorLogger.error(event);
  });
}

export function loggerForTests(
  errorFn?: (message: string, type: MomoErrorType, data?: MomoEventData, error?: Error) => void
): Logger {
  return {
    debug: (message, data) => logger.info({ message, data }),
    error: (message, type, data, error) => {
      errorLogger.error({ message, type, data, error });
      if (errorFn) errorFn(message, type, data, error);
    },
  };
}
