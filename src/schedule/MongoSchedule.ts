import { v4 as uuid } from 'uuid';

import { Connection, type MomoConnectionOptions } from '../Connection';
import { maxNodeTimeoutDelay } from '../job/Job';
import { Schedule } from './Schedule';
import { SchedulePing } from './SchedulePing';

export interface MomoOptions extends MomoConnectionOptions {
  /**
   * The keep alive ping interval of the schedule, in milliseconds.
   * After twice the amount of time has elapsed without a ping, a schedule is considered dead.
   *
   * The default value is 60_000
   */
  pingIntervalMs?: number;

  /**
   * Only one schedule per name can be active at a time.
   */
  scheduleName: string;

  /**
   * Configure how often schedule pings should be retried (default is no retries).
   */
  pingRetryOptions?: PingRetryOptions;
}

export interface PingRetryOptions {
  maxPingAttempts: number;
  retryIntervalMs: number;
}

export class MongoSchedule extends Schedule {
  private readonly schedulePing: SchedulePing;
  private readonly disconnectFct: () => Promise<void>;

  private constructor(
    protected readonly scheduleId: string,
    protected readonly connection: Connection,
    pingIntervalMs: number,
    maxPingAttempts: number,
    retryIntervalMs: number,
  ) {
    if (
      !Number.isFinite(pingIntervalMs) ||
      pingIntervalMs < 1 ||
      pingIntervalMs > maxNodeTimeoutDelay
    ) {
      throw new Error(
        `Error: pingIntervalMs must be a positive number less than ${maxNodeTimeoutDelay}`,
      );
    }

    if (!Number.isFinite(maxPingAttempts) || maxPingAttempts < 1) {
      throw new Error('Error: maxPingAttempts must be a positive number');
    }

    if (
      !Number.isFinite(retryIntervalMs) ||
      retryIntervalMs < 1 ||
      retryIntervalMs > maxNodeTimeoutDelay
    ) {
      throw new Error(
        `Error: retryIntervalMs must be a positive number less than ${maxNodeTimeoutDelay}`,
      );
    }

    const schedulesRepository = connection.getSchedulesRepository();
    const jobRepository = connection.getJobRepository();

    super(scheduleId, schedulesRepository, jobRepository);

    jobRepository.setLogger(this.logger);
    schedulesRepository.setLogger(this.logger);

    this.disconnectFct = connection.disconnect.bind(connection);
    this.schedulePing = new SchedulePing(
      schedulesRepository,
      this.logger,
      pingIntervalMs,
      this.startAllJobs.bind(this),
      maxPingAttempts,
      retryIntervalMs,
    );
  }

  /**
   * Creates a MongoSchedule that is connected to the MongoDB with the provided url.
   *
   * @param momoOptions configuration options for the connection to establish and the Schedule instance to create
   */
  public static async connect({
    pingIntervalMs = 60_000,
    scheduleName,
    pingRetryOptions,
    ...connectionOptions
  }: MomoOptions): Promise<MongoSchedule> {
    const scheduleId = uuid();
    const connection = await Connection.create(
      connectionOptions,
      pingIntervalMs,
      scheduleId,
      scheduleName,
    );
    const { maxPingAttempts = 1, retryIntervalMs = 500 } =
      pingRetryOptions ?? {};

    return new MongoSchedule(
      scheduleId,
      connection,
      pingIntervalMs,
      maxPingAttempts,
      retryIntervalMs,
    );
  }

  /**
   * Cancels all jobs on the schedule and disconnects the database.
   */
  public async disconnect(): Promise<void> {
    await this.cancel();
    await this.schedulePing.stop();
    await this.disconnectFct();
  }

  /**
   * Start the schedule.
   *
   * Updates made to the jobs after starting the scheduler are picked up
   * automatically from the database, EXCEPT for changes to schedule.
   * Start the scheduler again to change a job's schedule.
   *
   * @throws if the database throws
   */
  public async start(): Promise<void> {
    this.logger.debug('starting the schedule', { jobCount: this.count() });
    return this.schedulePing.start();
  }

  public id(): string {
    return this.scheduleId;
  }
}
