import type { MomoJob } from '../job/MomoJob';
import { type MomoOptions, MongoSchedule } from './MongoSchedule';

export class MongoScheduleBuilder {
  private momoJobs?: MomoJob[];
  private momoConnectionOptions?: MomoOptions;

  withJob(momoJob: MomoJob): this {
    this.momoJobs = this.momoJobs ? this.momoJobs.concat(momoJob) : [momoJob];
    return this;
  }

  withConnection(momoConnectionOptions: MomoOptions): this {
    this.momoConnectionOptions = momoConnectionOptions;
    return this;
  }

  async build(): Promise<MongoSchedule> {
    if (!this.momoConnectionOptions) {
      throw Error(
        'Error: MongoSchedule must be built with defined ConnectionOptions',
      );
    }

    const mongoSchedule = await MongoSchedule.connect(
      this.momoConnectionOptions,
    );

    for (const momoJob of this.momoJobs ?? []) {
      await mongoSchedule.define(momoJob);
    }

    return mongoSchedule;
  }
}
