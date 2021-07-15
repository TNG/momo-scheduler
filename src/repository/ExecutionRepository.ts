import { DateTime } from 'luxon';
import { EntityRepository, MongoRepository } from 'typeorm';
import { v4 as uuid } from 'uuid';

import { ExecutionEntity } from './ExecutionEntity';
import { ExecutionPing, pingInterval } from '../executor/ExecutionPing';

export const deadExecutionThreshold = 1.1 * pingInterval;

@EntityRepository(ExecutionEntity)
export class ExecutionRepository extends MongoRepository<ExecutionEntity> {
  async add(name: string, maxRunning: number): Promise<ExecutionPing | undefined> {
    const executions = await this.find({ name });
    console.log('executions running for job ' + name, executions.length);
    if (maxRunning > 0 && executions.length >= maxRunning) {
      return;
    }

    const execution = uuid();
    await this.save(new ExecutionEntity(execution, DateTime.now().toMillis(), name));
    return new ExecutionPing(execution);
  }

  async executions(name: string): Promise<number> {
    const timestamp = DateTime.now().toMillis() - deadExecutionThreshold;
    const entities = await this.find({ where: { name, timestamp: { $gt: timestamp } } });
    return entities.length;
  }

  async ping(execution: string): Promise<void> {
    await this.findOneAndUpdate({ execution }, { $set: { timestamp: DateTime.now().toMillis() } });
  }

  async clean(name: string): Promise<number> {
    const timestamp = DateTime.now().toMillis() - deadExecutionThreshold;
    const deadExecutions = await this.find({ where: { name, timestamp: { $lt: timestamp } } });
    const removedEntities = await this.remove(deadExecutions);
    return removedEntities.length;
  }
}
