import { Handler, MomoJob, isCronSchedule } from './MomoJob';

interface MomoJobBuilderBase<JobParams, T> {
  withName: (name: string) => T;
  withConcurrency: (concurrency: number) => T;
  withMaxRunning: (maxRunning: number) => T;
  withHandler: (handler: Handler<JobParams>) => T;
  withParameters: (parameters: JobParams) => T;
  build: () => MomoJob<JobParams>;
}

interface MomoIntervalJobBuilder<JobParams> extends MomoJobBuilderBase<JobParams, MomoIntervalJobBuilder<JobParams>> {
  withSchedule: (interval: number | string, firstRunAfter?: number | string) => MomoIntervalJobBuilder<JobParams>;
}

interface MomoCronJobBuilder<JobParams> extends MomoJobBuilderBase<JobParams, MomoCronJobBuilder<JobParams>> {
  withCronSchedule: (cronSchedule: string) => MomoCronJobBuilder<JobParams>;
}

export class MomoJobBuilder<JobParams> {
  protected momoJob: Partial<MomoJob<JobParams>> = {};

  withName(name: string): this {
    this.momoJob.name = name;
    return this;
  }

  // The interval is either a number in milliseconds or an interval in human-readable form (see readme)
  withSchedule(interval: number | string, firstRunAfter: number | string = 0): MomoIntervalJobBuilder<JobParams> {
    this.momoJob.schedule = { firstRunAfter, interval };
    return this;
  }

  withCronSchedule(cronSchedule: string): MomoCronJobBuilder<JobParams> {
    this.momoJob.schedule = { cronSchedule };
    return this;
  }

  withParameters(jobParameters: JobParams): this {
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

  withHandler(handler: Handler<JobParams>): this {
    this.momoJob.handler = handler;
    return this;
  }

  build(): MomoJob<JobParams> {
    const name = this.momoJob.name;
    if (name === undefined) {
      throw Error('Error: Job must have a specified name');
    }

    const schedule = this.momoJob.schedule;
    if (!schedule) {
      throw Error('Error: Job must have a specified schedule');
    }

    const handler = this.momoJob.handler;
    if (!handler) {
      throw Error('Error: Job must have a specified handler');
    }

    // compiler needs to know the type of schedule to get the types right
    return isCronSchedule(schedule)
      ? { ...this.momoJob, name, schedule, handler }
      : { ...this.momoJob, name, schedule, handler };
  }
}
