import { DateTime } from 'luxon';
import { EntityRepository, MongoRepository } from 'typeorm';

import { ExecutionEntity } from './ExecutionEntity';
import { pingInterval } from '../schedule/SchedulePing';

export const deadExecutionThreshold = 1.1 * pingInterval;

@EntityRepository(ExecutionEntity)
export class ExecutionRepository extends MongoRepository<ExecutionEntity> {
  async addSchedule(scheduleId: string): Promise<void> {
    await this.save(new ExecutionEntity(scheduleId, DateTime.now().toMillis(), {}));
  }

  async addJob(scheduleId: string, name: string): Promise<void> {
    const entity = await this.findOne({ scheduleId });
    if (entity === undefined) {
      throw new Error(`executionEntity not found for scheduleId=${scheduleId}`);
    }
    await this.update({ scheduleId }, { executions: { ...entity.executions, [name]: 0 } });
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
    const executionEntity = await this.findOne({ scheduleId });
    if (executionEntity === undefined) {
      throw new Error(`executionEntity not found for scheduleId=${scheduleId}`);
    }

    const executions = executionEntity.executions;
    delete executions[name];
    await this.update({ scheduleId }, { executions });
  }

  async countRunningExecutions(name: string): Promise<number> {
    const timestamp = DateTime.now().toMillis() - deadExecutionThreshold;
    return (await this.find({ where: { timestamp: { $gt: timestamp } } }))
      .map((entity) => entity.executions[name] ?? 0)
      .reduce((sum, current) => sum + current, 0);
  }

  async ping(scheduleId: string): Promise<void> {
    await this.findOneAndUpdate({ scheduleId }, { $set: { timestamp: DateTime.now().toMillis() } });
  }
}
