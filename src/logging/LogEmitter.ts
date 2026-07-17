import EventEmitter from 'node:events';
import { debug, error, type Logger } from './Logger.js';
import type { MomoEvents } from './MomoEvents.js';
import type { TypedEmitter } from './TypedEmitter.js';

export class LogEmitter extends (EventEmitter as new () => TypedEmitter<MomoEvents>) {
  protected readonly logger: Logger;

  protected constructor() {
    super();
    this.logger = { debug: debug.bind(this), error: error.bind(this) };
  }
}
