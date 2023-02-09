import { v4 as uuid } from 'uuid';

import { Connection, MomoConnectionOptions } from '../Connection';
import { Schedule } from './Schedule';
import { SchedulePing } from './SchedulePing';

export interface MomoOptions extends MomoConnectionOptions {
  /**
   * The keep alive ping interval of the schedule, in seconds.
   * After twice the amount of time has elapsed without a ping, a schedule is considered dead.
   */
  pingInterval?: number;
}

export class MongoSchedule extends Schedule {
  private readonly schedulePing: SchedulePing;
  private readonly disconnectFct: () => Promise<void>;

  private constructor(protected readonly scheduleId: string, connection: Connection, pingInterval: number) {
    const schedulesRepository = connection.getSchedulesRepository(2 * pingInterval, scheduleId);
    const jobRepository = connection.getJobRepository();

    super(scheduleId, schedulesRepository, jobRepository);

    jobRepository.setLogger(this.logger);
    schedulesRepository.setLogger(this.logger);

    this.disconnectFct = connection.disconnect.bind(connection);
    this.schedulePing = new SchedulePing(
      scheduleId,
      schedulesRepository,
      this.logger,
      pingInterval,
      this.startAllJobs.bind(this)
    );
  }

  /**
   * Creates a MongoSchedule that is connected to the MongoDB with the provided url.
   *
   * @param momoOptions configuration options for the connection to establish and the Schedule instance to create
   */
  public static async connect({ pingInterval = 60, ...connectionOptions }: MomoOptions): Promise<MongoSchedule> {
    const connection = await Connection.create(connectionOptions);

    const scheduleId = uuid();
    const pingIntervalMs = pingInterval * 1000;
    const schedulesRepository = connection.getSchedulesRepository(2 * pingIntervalMs, scheduleId);
    await schedulesRepository.createIndex();

    return new MongoSchedule(scheduleId, connection, pingIntervalMs);
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

  private async startAllJobs(): Promise<void> {
    await Promise.all(Object.values(this.getJobSchedulers()).map(async (jobScheduler) => jobScheduler.start()));
  }

  public id(): string {
    return this.scheduleId;
  }
}
