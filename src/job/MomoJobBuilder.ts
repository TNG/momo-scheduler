import { Handler, JobParameters, MomoJob } from './MomoJob';

interface MomoJobBuilderBase<T> {
  withName: (name: string) => T;
  withConcurrency: (concurrency: number) => T;
  withMaxRunning: (maxRunning: number) => T;
  withHandler: (handler: Handler) => T;
  withParameters: (parameters: JobParameters) => T;
  withTimeout: (timeout: number) => T;
  build: () => MomoJob;
}

interface MomoIntervalJobBuilder extends MomoJobBuilderBase<MomoIntervalJobBuilder> {
  withSchedule: (interval: number | string, firstRunAfter?: number | string) => MomoIntervalJobBuilder;
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

  // The interval is either a number in milliseconds or an interval in human-readable form (see readme)
  withSchedule(interval: number | string, firstRunAfter: number | string = 0): MomoIntervalJobBuilder {
    if (interval === 'Never' || interval === 'never') {
      this.momoJob.schedule = { interval };
      return this;
    }

    this.momoJob.schedule = { firstRunAfter, interval };
    return this;
  }

  withCronSchedule(cronSchedule: string): MomoCronJobBuilder {
    this.momoJob.schedule = { cronSchedule };
    return this;
  }

  withParameters(jobParameters: JobParameters): this {
    this.momoJob.parameters = jobParameters;
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

  withTimeout(timeout: number): this {
    this.momoJob.timeout = timeout;
    return this;
  }

  build(): MomoJob {
    if (this.momoJob.name === undefined) {
      throw Error('Error: Job must have a specified name');
    }

    if (!this.momoJob.schedule) {
      throw Error('Error: Job must have a specified schedule');
    }

    if (!this.momoJob.handler) {
      throw Error('Error: Job must have a specified handler');
    }

    return this.momoJob as MomoJob;
  }
}
