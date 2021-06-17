import EventEmitter from 'events';
import TypedEmitter from 'typed-emitter';
import { MomoEvents } from './MomoEvents';
import { debug, error, Logger } from './Logger';

export class LogEmitter extends (EventEmitter as new () => TypedEmitter<MomoEvents>) {
  protected readonly logger: Logger;

  protected constructor() {
    super();
    this.logger = { debug: debug.bind(this), error: error.bind(this) };
  }
}
