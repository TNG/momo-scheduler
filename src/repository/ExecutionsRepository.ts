import { DateTime } from 'luxon';
import { EntityRepository, MongoRepository } from 'typeorm';

import { ExecutionsEntity } from './ExecutionsEntity';
import { defaultInterval } from '../schedule/SchedulePing';

@EntityRepository(ExecutionsEntity)
export class ExecutionsRepository extends MongoRepository<ExecutionsEntity> {
  public static deadScheduleThreshold = 2 * defaultInterval;

  async addSchedule(scheduleId: string): Promise<void> {
    await this.save(new ExecutionsEntity(scheduleId, DateTime.now().toMillis(), {}));
  }

  async removeJob(scheduleId: string, name: string): Promise<void> {
    const executionsEntity = await this.findOne({ scheduleId });
    if (executionsEntity === undefined) {
      throw new Error(`executionsEntity not found for scheduleId=${scheduleId}`);
    }

    const executions = executionsEntity.executions;
    delete executions[name];
    await this.update({ scheduleId }, { executions });
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

    await this.findOneAndUpdate({ scheduleId }, { $inc: { [`executions.${name}`]: 1 } });

    return { added: true, running };
  }

  async removeExecution(scheduleId: string, name: string): Promise<void> {
    await this.findOneAndUpdate({ scheduleId }, { $inc: { [`executions.${name}`]: -1 } });
  }

  async countRunningExecutions(name: string): Promise<number> {
    const timestamp = DateTime.now().toMillis() - ExecutionsRepository.deadScheduleThreshold;
    const numbers = (await this.find({ where: { timestamp: { $gt: timestamp } } })).map((executionsEntity) => {
      return executionsEntity.executions[name] ?? 0;
    });
    return numbers.reduce((sum, current) => sum + current, 0);
  }

  async ping(scheduleId: string): Promise<void> {
    await this.findOneAndUpdate({ scheduleId }, { $set: { timestamp: DateTime.now().toMillis() } });
  }

  async clean(): Promise<number> {
    const timestamp = DateTime.now().toMillis() - ExecutionsRepository.deadScheduleThreshold;
    const result = await this.deleteMany({ timestamp: { $lt: timestamp } });
    return result.deletedCount ?? 0;
  }
}
