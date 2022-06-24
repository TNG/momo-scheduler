import { Handler, MomoJob } from './MomoJob';

interface MomoJobBuilderBase<T> {
  withName: (name: string) => T;
  withConcurrency: (concurrency: number) => T;
  withMaxRunning: (maxRunning: number) => T;
  withHandler: (handler: Handler) => T;
  build: () => MomoJob;
}

interface MomoIntervalJobBuilder extends MomoJobBuilderBase<MomoIntervalJobBuilder> {
  withSchedule: (interval: string, firstRunAfter?: number) => MomoIntervalJobBuilder;
}

interface MomoCronJobBuilder extends MomoJobBuilderBase<MomoCronJobBuilder> {
  withCronSchedule: (cronSchedule: string) => MomoCronJobBuilder;
}

export class MomoJobBuilder {
  protected momoJob: Partial<MomoJob> = {};

  withName(name: string): this {
    this.momoJob.name = name;
    return this;
  }

  withSchedule(interval: string, firstRunAfter = 0): MomoIntervalJobBuilder {
    this.momoJob.schedule = { firstRunAfter, interval };
    return this;
  }

  withCronSchedule(cronSchedule: string): MomoCronJobBuilder {
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
      throw Error('Error: Job must have a specified schedule');
    }

    if (this.momoJob.handler === undefined) {
      throw Error('Error: Job must have a specified handler');
    }

    return this.momoJob as MomoJob;
  }
}
