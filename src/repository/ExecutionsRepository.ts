import { DateTime } from 'luxon';
import { EntityRepository, MongoRepository } from 'typeorm';

import { ExecutionsEntity } from './ExecutionsEntity';
import { pingInterval } from '../schedule/SchedulePing';

export const deadExecutionThreshold = 2 * pingInterval;

@EntityRepository(ExecutionsEntity)
export class ExecutionsRepository extends MongoRepository<ExecutionsEntity> {
  async addSchedule(scheduleId: string): Promise<void> {
    console.log('add schedule', scheduleId);
    await this.save(new ExecutionsEntity(scheduleId, DateTime.now().toMillis(), {}));
  }

  async addJob(scheduleId: string, name: string): Promise<void> {
    const executionsEntity = await this.findOne({ scheduleId });
    if (executionsEntity === undefined) {
      throw new Error(`executionsEntity not found for scheduleId=${scheduleId}`);
    }
    await this.update({ scheduleId }, { executions: { ...executionsEntity.executions, [name]: 0 } });
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

  async removeJob(scheduleId: string, name: string) {
    const executionsEntity = await this.findOne({ scheduleId });
    if (executionsEntity === undefined) {
      throw new Error(`executionsEntity not found for scheduleId=${scheduleId}`);
    }

    const executions = executionsEntity.executions;
    delete executions[name];
    await this.update({ scheduleId }, { executions });
  }

  async countRunningExecutions(name: string): Promise<number> {
    const timestamp = DateTime.now().toMillis() - deadExecutionThreshold;
    return (await this.find({ where: { timestamp: { $gt: timestamp } } }))
      .map((executionsEntity) => executionsEntity.executions[name] ?? 0)
      .reduce((sum, current) => sum + current, 0);
  }

  async ping(scheduleId: string): Promise<void> {
    await this.findOneAndUpdate({ scheduleId }, { $set: { timestamp: DateTime.now().toMillis() } });
  }
}
