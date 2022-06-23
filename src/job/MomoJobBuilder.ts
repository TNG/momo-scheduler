import { Handler, MomoJob, isCronSchedule, isInterval } from './MomoJob';

export class MomoJobBuilder {
  private momoJob: Partial<MomoJob> = {};

  withName(name: string): this {
    this.momoJob.name = name;
    return this;
  }

  withInterval(interval: string): this {
    if (this.momoJob.schedule !== undefined && isInterval(this.momoJob.schedule)) {
      this.momoJob.schedule = { ...this.momoJob.schedule, interval };
      return this;
    }

    this.momoJob.schedule = { interval, firstRunAfter: 0 };
    return this;
  }

  withFirstRunAfter(firstRunAfter: number): this {
    if (this.momoJob.schedule !== undefined && isCronSchedule(this.momoJob.schedule)) {
      throw new Error('Error: Setting a firstRunAfter on a cron job');
    }

    if (this.momoJob.schedule?.interval === undefined) {
      throw new Error('Error: Setting a firstRunAfter before interval');
    }

    this.momoJob.schedule = { ...this.momoJob.schedule, firstRunAfter };
    return this;
  }

  withCronSchedule(cronSchedule: string): this {
    this.momoJob.schedule = { cronSchedule };
    return this;
  }

  withConcurrency(concurrency: number): this {
    this.momoJob.concurrency = concurrency;
    return this;
  }

  withMaxRunning(maxRunning: number): this {
    this.momoJob.maxRunning = maxRunning;
    return this;
  }

  withHandler(handler: Handler): this {
    this.momoJob.handler = handler;
    return this;
  }

  build(): MomoJob {
    if (this.momoJob.name === undefined) {
      throw Error('Error: Job must have a specified name');
    }

    if (this.momoJob.schedule === undefined) {
      throw Error('Error: Job must have either a specified schedule');
    }

    if (this.momoJob.handler === undefined) {
      throw Error('Error: Job must have a specified handler');
    }

    return this.momoJob as MomoJob;
  }
}
