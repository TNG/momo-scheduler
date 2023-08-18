import { DateTime } from 'luxon';
import { MongoClient } from 'mongodb';

import { ScheduleEntity } from './ScheduleEntity';
import { Repository } from './Repository';
import { Logger } from '../logging/Logger';
import { MomoErrorType } from '../logging/error/MomoErrorType';

export const SCHEDULES_COLLECTION_NAME = 'schedules';

export class SchedulesRepository extends Repository<ScheduleEntity> {
  private logger: Logger | undefined;

  constructor(
    mongoClient: MongoClient,
    private readonly deadScheduleThreshold: number,
    private readonly scheduleId: string,
    private readonly name: string,
    collectionPrefix?: string,
  ) {
    super(mongoClient, SCHEDULES_COLLECTION_NAME, collectionPrefix);
  }

  setLogger(logger: Logger): void {
    this.logger = logger;
  }

  async getActiveSchedule(name: string): Promise<string | undefined> {
    const threshold = DateTime.now().toMillis() - this.deadScheduleThreshold;
    const activeSchedule = await this.collection.findOne({ name, lastAlive: { $gte: threshold } });
    const foo = await this.collection.find({}).toArray();
    // eslint-disable-next-line no-console
    console.log(foo);
    return activeSchedule?.scheduleId;
  }

  async setActiveSchedule(name: string): Promise<boolean> {
    try {
      await this.collection.updateOne(
        { name },
        {
          $set: {
            name,
            scheduleId: this.scheduleId,
            lastAlive: DateTime.now().toMillis(),
            executions: {},
          },
        },
        {
          upsert: true,
        },
      );

      return true;
    } catch (error) {
      // We seem to have a schedule that's alive. The unique name index probably prevented the upsert.
      this.logger?.error(
        'The database reported an unexpected error',
        MomoErrorType.internal,
        { scheduleId: this.scheduleId },
        error,
      );
      return false;
    }
  }

  async ping(scheduleId = this.scheduleId): Promise<void> {
    await this.updateOne({ scheduleId }, { $set: { lastAlive: DateTime.now().toMillis() } });
  }

  async createIndex(): Promise<void> {
    // this unique index ensures that we do not insert more than one active schedule
    // in the repository per schedule name
    await this.collection.createIndex({ name: 1 }, { unique: true });
  }

  async removeJob(scheduleId: string, name: string): Promise<void> {
    const schedulesEntity = await this.findOne({ scheduleId });
    if (!schedulesEntity) {
      throw new Error(`schedulesEntity not found for scheduleId=${scheduleId}`);
    }

    const executions = schedulesEntity.executions;
    delete executions[name];
    await this.updateOne({ scheduleId }, { $set: { executions } });
  }

  async addExecution(name: string, maxRunning: number): Promise<{ added: boolean; running: number }> {
    if (maxRunning < 1) {
      const schedule = await this.collection.findOneAndUpdate(
        { name: this.name },
        { $inc: { [`executions.${name}`]: 1 } },
        { returnDocument: 'after' },
      );
      return { added: schedule.value !== null, running: schedule.value?.executions[name] ?? 0 };
    }

    const schedule = await this.collection.findOneAndUpdate(
      {
        name: this.name,
        $or: [{ [`executions.${name}`]: { $lt: maxRunning } }, { [`executions.${name}`]: { $exists: false } }],
      },
      { $inc: { [`executions.${name}`]: 1 } },
      { returnDocument: 'after' },
    );

    return { added: schedule.value !== null, running: schedule.value?.executions[name] ?? maxRunning };
  }

  async removeExecution(name: string): Promise<void> {
    await this.updateOne({ name: this.name }, { $inc: { [`executions.${name}`]: -1 } });
  }

  async countRunningExecutions(name: string): Promise<number> {
    return (await this.findOne({ scheduleId: this.scheduleId }))?.executions[name] ?? 0;
  }
}
