import { DateTime } from 'luxon';
import { MongoClient } from 'mongodb';

import { ScheduleEntity } from './ScheduleEntity';
import { Repository } from './Repository';
import { Logger } from '../logging/Logger';
import { MomoErrorType } from '../logging/error/MomoErrorType';

export const SCHEDULES_COLLECTION_NAME = 'schedules';

export enum ScheduleState {
  inactive,
  differentInstanceActive,
  thisInstanceActive,
}

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

  getScheduleId(): string {
    return this.scheduleId;
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
  async getScheduleState(now: number): Promise<ScheduleState> {
    const threshold = now - this.deadScheduleThreshold;
    const activeSchedule = await this.collection.findOne({ name: this.name });
    if (activeSchedule === null) {
      return ScheduleState.inactive;
    }

    if (activeSchedule.scheduleId !== this.scheduleId) {
      return activeSchedule.lastAlive >= threshold ? ScheduleState.differentInstanceActive : ScheduleState.inactive;
    }

    return ScheduleState.thisInstanceActive;
  }

  /**
   * Tries to set this instance as active
   *
   * @param now timestamp in milliseconds
   * @returns true if this instance is now active for the schedule with this name, false otherwise
   */
  async setActiveSchedule(now: number): Promise<boolean> {
    const threshold = now - this.deadScheduleThreshold;

    try {
      await this.collection.updateOne(
        { name: this.name, lastAlive: { $lt: threshold } }, // overwrite a dead (too old) schedule
        {
          $set: {
            name: this.name,
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

  async ping(): Promise<void> {
    await this.updateOne({ scheduleId: this.scheduleId }, { $set: { lastAlive: DateTime.now().toMillis() } });
  }

  async createIndex(): Promise<void> {
    // this unique index ensures that we do not insert more than one active schedule
    // in the repository per schedule name
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
