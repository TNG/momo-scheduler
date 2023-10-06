import { Filter, FindOneAndUpdateOptions, MongoClient, MongoServerError } from 'mongodb';
import { DateTime } from 'luxon';

import { ScheduleEntity } from './ScheduleEntity';
import { Repository } from './Repository';
import { Logger } from '../logging/Logger';
import { MomoErrorType } from '../logging/error/MomoErrorType';
import { MomoEventData } from '../logging/MomoEvents';

export const SCHEDULES_COLLECTION_NAME = 'schedules';

const mongoOptions: FindOneAndUpdateOptions & { includeResultMetadata: true } = {
  returnDocument: 'after',
  includeResultMetadata: true, // ensures backwards compatibility with mongodb <6
};

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
   * @param threshold a schedule older than (i.e. timestamp below) the threshold is considered dead and will be replaced
   * @returns the schedule's state
   */
  private async isActiveSchedule(threshold: number): Promise<boolean> {
    const activeSchedule = await this.collection.findOne({ name: this.name });

    if (activeSchedule === null || activeSchedule.scheduleId === this.scheduleId) {
      return true;
    }

    return activeSchedule.lastAlive < threshold; // if activeSchedule is too old, take over and make this one active
  }

  /**
   * Tries to set this instance as active schedule of this name.
   *
   * There are 4 possible cases:
   *
   * 1) Another instance already is active for this name. This instance does not need to become active. Nothing is done.
   *
   * 2) Another instance was active, but it's last ping was before the threshold. Hence, it is considered dead and this instance will take over and become active. The DB is updated accordingly.
   *
   * 3) There is currently no active schedule with this name. In this case, this instance will become the active schedule. The DB is updated accordingly.
   *
   * 4) This instance already is active. It will stay active and send a ping to the DB to indicate that it is still alive.
   *
   * @returns true if this instance is now active for the schedule with this name (cases 2-4), false otherwise (case 1)
   */
  async setActiveSchedule(): Promise<boolean> {
    const now = DateTime.now().toMillis();
    const threshold = now - this.deadScheduleThreshold;

    const active = await this.isActiveSchedule(now);
    if (!active) {
      this.logger?.debug('This schedule is not active', this.getLogData());
      return false;
    }

    const deadSchedule: Filter<ScheduleEntity> = { name: this.name, lastAlive: { $lt: threshold } };
    const thisSchedule: Filter<ScheduleEntity> = { scheduleId: this.scheduleId };

    const updatedSchedule: Partial<ScheduleEntity> = {
      name: this.name,
      scheduleId: this.scheduleId,
      lastAlive: now,
      executions: {},
    };

    try {
      await this.collection.updateOne(
        // we already checked with isActiveSchedule that this instance should be the active one, but to prevent
        // concurrent modification, we use a filter to ensure that we only overwrite a dead schedule or ping this schedule
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
        mongoOptions,
      );
      return { added: schedule.value !== null, running: schedule.value?.executions[jobName] ?? 0 };
    }

    const schedule = await this.collection.findOneAndUpdate(
      {
        name: this.name,
        $or: [{ [`executions.${jobName}`]: { $lt: maxRunning } }, { [`executions.${jobName}`]: { $exists: false } }],
      },
      { $inc: { [`executions.${jobName}`]: 1 } },
      mongoOptions,
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
