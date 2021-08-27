import { MomoJob } from '../job/MomoJob';
import { MomoConnectionOptions } from '../Connection';
import { MongoSchedule } from './MongoSchedule';

export class MongoScheduleBuilder {
  private momoJobs?: MomoJob[];
  private momoConnectionOptions?: MomoConnectionOptions;

  withJob(momoJob: MomoJob): this {
    this.momoJobs = this.momoJobs ? this.momoJobs.concat(momoJob) : [momoJob];
    return this;
  }

  withConnection(momoConnectionOptions: MomoConnectionOptions): this {
    this.momoConnectionOptions = momoConnectionOptions;
    return this;
  }

  async build(): Promise<MongoSchedule> {
    if (!this.momoConnectionOptions) {
      throw Error('Error: MongoSchedule must be built with defined ConnectionOptions');
    }
    if (!this.momoJobs) {
      throw Error('Error: MongoSchedule must be built with at least one defined job');
    }

    const mongoSchedule = await MongoSchedule.connect(this.momoConnectionOptions);

    for (const momoJob of this.momoJobs) {
      await mongoSchedule.define(momoJob);
    }

    return mongoSchedule;
  }
}
