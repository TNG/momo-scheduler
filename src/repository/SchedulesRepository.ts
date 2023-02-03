import { DateTime } from 'luxon';
import { MongoClient } from 'mongodb';

import { ScheduleEntity } from './ScheduleEntity';
import { Repository } from './Repository';

export const SCHEDULES_COLLECTION_NAME = 'schedules';

export class SchedulesRepository extends Repository<ScheduleEntity> {
  constructor(
    mongoClient: MongoClient,
    private readonly deadScheduleThreshold: number,
    private readonly scheduleId: string,
    collectionPrefix?: string
  ) {
    super(mongoClient, SCHEDULES_COLLECTION_NAME, collectionPrefix);
  }

  async isActiveSchedule(scheduleId = this.scheduleId): Promise<boolean> {
    const threshold = DateTime.now().toMillis() - this.deadScheduleThreshold;
    try {
      const result = await this.collection.findOneAndUpdate(
        { lastAlive: { $lt: threshold } },
        {
          $set: {
            name: 'schedule',
            scheduleId,
            lastAlive: DateTime.now().toMillis(),
            executions: {},
          },
        },
        {
          upsert: true,
          returnDocument: 'after',
        }
      );

      return result.value === null ? false : result.value.scheduleId === scheduleId;
    } catch (e) {
      return false;
    }
  }

  async createIndex(): Promise<void> {
    // this unique index combined with the always same `name` value of every schedule, ensures
    // that we do not insert more than one active schedule in the repository
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
    const running = await this.countRunningExecutions(name);
    if (maxRunning > 0 && running >= maxRunning) {
      return { added: false, running };
    }

    await this.updateOne({ scheduleId: this.scheduleId }, { $inc: { [`executions.${name}`]: 1 } });

    return { added: true, running };
  }

  async removeExecution(name: string): Promise<void> {
    await this.updateOne({ scheduleId: this.scheduleId }, { $inc: { [`executions.${name}`]: -1 } });
  }

  async countRunningExecutions(name: string): Promise<number> {
    return (await this.findOne({ scheduleId: this.scheduleId }))?.executions[name] ?? 0;
  }

  async ping(scheduleId = this.scheduleId): Promise<void> {
    await this.updateOne({ scheduleId }, { $set: { lastAlive: DateTime.now().toMillis() } });
  }
}
