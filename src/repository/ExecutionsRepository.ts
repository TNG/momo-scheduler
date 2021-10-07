import { DateTime } from 'luxon';
import { MongoClient } from 'mongodb';

import { ExecutionsEntity } from './ExecutionsEntity';
import { Repository } from './Repository';

export const EXECUTIONS_COLLECTION_NAME = 'executions';

export class ExecutionsRepository extends Repository<ExecutionsEntity> {
  constructor(mongoClient: MongoClient, private readonly deadScheduleThreshold: number, collectionPrefix?: string) {
    super(mongoClient, EXECUTIONS_COLLECTION_NAME, collectionPrefix);
  }

  async addSchedule(scheduleId: string): Promise<void> {
    await this.save({ scheduleId, timestamp: DateTime.now().toMillis(), executions: {} });
  }

  async removeJob(scheduleId: string, name: string): Promise<void> {
    const executionsEntity = await this.findOne({ scheduleId });
    if (executionsEntity === undefined) {
      throw new Error(`executionsEntity not found for scheduleId=${scheduleId}`);
    }

    const executions = executionsEntity.executions;
    delete executions[name];
    await this.updateOne({ scheduleId }, { $set: { executions } });
  }

  async addExecution(
    scheduleId: string,
    name: string,
    maxRunning: number
  ): Promise<{ added: boolean; running: number }> {
    const running = await this.countRunningExecutions(name);
    if (maxRunning > 0 && running >= maxRunning) {
      return { added: false, running };
    }

    await this.updateOne({ scheduleId }, { $inc: { [`executions.${name}`]: 1 } });

    return { added: true, running };
  }

  async removeExecution(scheduleId: string, name: string): Promise<void> {
    await this.updateOne({ scheduleId }, { $inc: { [`executions.${name}`]: -1 } });
  }

  async countRunningExecutions(name: string): Promise<number> {
    const timestamp = DateTime.now().toMillis() - this.deadScheduleThreshold;
    const numbers = (await this.find({ timestamp: { $gt: timestamp } })).map((executionsEntity) => {
      return executionsEntity.executions[name] ?? 0;
    });
    return numbers.reduce((sum, current) => sum + current, 0);
  }

  async ping(scheduleId: string): Promise<void> {
    await this.updateOne({ scheduleId }, { $set: { timestamp: DateTime.now().toMillis() } });
  }

  async clean(): Promise<number> {
    const timestamp = DateTime.now().toMillis() - this.deadScheduleThreshold;
    return this.delete({ timestamp: { $lt: timestamp } });
  }
}
