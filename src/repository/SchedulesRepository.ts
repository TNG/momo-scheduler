import { Filter, MongoClient, MongoServerError } from 'mongodb';

import { ScheduleEntity } from './ScheduleEntity';
import { Repository } from './Repository';
import { Logger } from '../logging/Logger';
import { MomoErrorType } from '../logging/error/MomoErrorType';
import { MomoEventData } from '../logging/MomoEvents';

export const SCHEDULES_COLLECTION_NAME = 'schedules';

const duplicateKeyErrorCode = 11000;

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

  getLogData(): MomoEventData {
    return { name: this.name, scheduleId: this.scheduleId };
  }

  async deleteOne(): Promise<void> {
    await this.collection.deleteOne({ scheduleId: this.scheduleId });
  }

  /**
   * Checks the state of the schedule represented by this repository.
   *
   * INACTIVE: There is currently no active instance for a schedule with this name.
   * DIFFERENT_INSTANCE_ACTIVE: Another instance (but not this one) is active for the schedule with this name.
   * THIS_INSTANCE_ACTIVE: This instance is active for the schedule with this name.
   *
   * @param now timestamp in milliseconds
   * @returns the schedule's state
   */
  async isActiveSchedule(now: number): Promise<boolean> {
    const threshold = now - this.deadScheduleThreshold;
    const activeSchedule = await this.collection.findOne({ name: this.name });

    if (activeSchedule === null || activeSchedule.scheduleId === this.scheduleId) {
      return true;
    }

    return activeSchedule.lastAlive < threshold; // if activeSchedule is too old, take over and make this one active
  }

  /**
   * Tries to set this instance as active
   *
   * @param now timestamp in milliseconds
   * @returns true if this instance is now active for the schedule with this name, false otherwise
   */
  async setActiveSchedule(now: number): Promise<boolean> {
    const threshold = now - this.deadScheduleThreshold;

    const deadSchedule: Filter<ScheduleEntity> = { name: this.name, lastAlive: { $lt: threshold } };
    const thisSchedule: Filter<ScheduleEntity> = { scheduleId: this.scheduleId };

    const updatedSchedule: ScheduleEntity = {
      name: this.name,
      scheduleId: this.scheduleId,
      lastAlive: now,
      executions: {},
    };

    try {
      await this.collection.updateOne(
        { $or: [deadSchedule, thisSchedule] },
        { $set: updatedSchedule },
        { upsert: true },
      );

      return true;
    } catch (error) {
      if (error instanceof MongoServerError && error.code === duplicateKeyErrorCode) {
        this.logger?.debug(
          'Cannot set active schedule - another schedule with this name is already active',
          this.getLogData(),
        );
      } else {
        this.logger?.error(
          'The database reported an unexpected error',
          MomoErrorType.internal,
          this.getLogData(),
          error,
        );
      }

      return false;
    }
  }

  /**
   * This unique index ensures that we do not insert more than one active schedule per schedule name
   * into the repository.
   */
  async createIndex(): Promise<void> {
    await this.collection.createIndex({ name: 1 }, { unique: true });
  }

  async removeJob(jobName: string): Promise<void> {
    const schedulesEntity = await this.findOne({ scheduleId: this.scheduleId });
    if (!schedulesEntity) {
      throw new Error(`schedulesEntity not found for scheduleId=${this.scheduleId}`);
    }

    const executions = schedulesEntity.executions;
    delete executions[jobName];
    await this.updateOne({ scheduleId: this.scheduleId }, { $set: { executions } });
  }

  async addExecution(jobName: string, maxRunning: number): Promise<{ added: boolean; running: number }> {
    if (maxRunning < 1) {
      const schedule = await this.collection.findOneAndUpdate(
        { name: this.name },
        { $inc: { [`executions.${jobName}`]: 1 } },
        { returnDocument: 'after' },
      );
      return { added: schedule.value !== null, running: schedule.value?.executions[jobName] ?? 0 };
    }

    const schedule = await this.collection.findOneAndUpdate(
      {
        name: this.name,
        $or: [{ [`executions.${jobName}`]: { $lt: maxRunning } }, { [`executions.${jobName}`]: { $exists: false } }],
      },
      { $inc: { [`executions.${jobName}`]: 1 } },
      { returnDocument: 'after' },
    );

    return { added: schedule.value !== null, running: schedule.value?.executions[jobName] ?? maxRunning };
  }

  async removeExecution(jobName: string): Promise<void> {
    await this.updateOne({ name: this.name }, { $inc: { [`executions.${jobName}`]: -1 } });
  }

  async countRunningExecutions(jobName: string): Promise<number> {
    return (await this.findOne({ scheduleId: this.scheduleId }))?.executions[jobName] ?? 0;
  }
}
