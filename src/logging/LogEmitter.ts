import EventEmitter from 'node:events';

import type TypedEmitter from 'typed-emitter';

import { debug, error, type Logger } from './Logger';
import type { MomoEvents } from './MomoEvents';

export class LogEmitter extends (EventEmitter as new () => TypedEmitter<MomoEvents>) {
  protected readonly logger: Logger;

  protected constructor() {
    super();
    this.logger = { debug: debug.bind(this), error: error.bind(this) };
  }
}
