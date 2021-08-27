import EventEmitter from 'events';
import TypedEmitter from 'typed-emitter';

import { Logger, debug, error } from './Logger';
import { MomoEvents } from './MomoEvents';

export class LogEmitter extends (EventEmitter as new () => TypedEmitter<MomoEvents>) {
  protected readonly logger: Logger;

  protected constructor() {
    super();
    this.logger = { debug: debug.bind(this), error: error.bind(this) };
  }
}
