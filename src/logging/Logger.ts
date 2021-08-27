import TypedEmitter from 'typed-emitter';

import { MomoErrorType } from './error/MomoErrorType';
import { MomoEventData, MomoEvents } from './MomoEvents';

export interface Logger {
  debug: (message: string, data?: MomoEventData) => void;
  error: (message: string, type: MomoErrorType, data?: MomoEventData, error?: Error) => void;
}

export function debug(this: TypedEmitter<MomoEvents>, message: string, data?: MomoEventData) {
  this.emit('debug', { message, data });
}

export function error(
  this: TypedEmitter<MomoEvents>,
  message: string,
  type: MomoErrorType,
  data?: MomoEventData,
  error?: Error
) {
  this.emit('error', { message, type, data, error });
}
