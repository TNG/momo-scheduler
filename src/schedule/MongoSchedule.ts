import { v4 as uuid } from 'uuid';

import { Connection, MomoConnectionOptions } from '../Connection';
import { Schedule } from './Schedule';
import { SchedulePing } from './SchedulePing';

export interface MomoOptions extends MomoConnectionOptions {
  /**
   * The keep alive ping interval of the schedule, in seconds.
   * After twice the amount of time has elapsed without a ping, stale job executions are considered dead.
   */
  pingInterval?: number;
}

export class MongoSchedule extends Schedule {
  private readonly schedulePing: SchedulePing;
  private readonly disconnectFct: () => Promise<void>;

  private constructor(scheduleId: string, connection: Connection, pingInterval: number) {
    const executionsRepository = connection.getExecutionsRepository(pingInterval);
    const jobRepository = connection.getJobRepository();

    super(scheduleId, executionsRepository, jobRepository);

    jobRepository.setLogger(this.logger);

    this.disconnectFct = connection.disconnect.bind(connection);
    this.schedulePing = new SchedulePing(scheduleId, executionsRepository, this.logger, pingInterval);
  }

  /**
   * Creates a MongoSchedule that is connected to the MongoDB with the provided url.
   *
   * @param momoOptions configuration options for the connection to establish and the Schedule instance to create
   */
  public static async connect({ pingInterval = 60, ...connectionOptions }: MomoOptions): Promise<MongoSchedule> {
    const connection = await Connection.create(connectionOptions);

    const pingIntervalMs = pingInterval * 1000;
    const executionsRepository = connection.getExecutionsRepository(2 * pingIntervalMs);

    const scheduleId = uuid();
    await executionsRepository.addSchedule(scheduleId);

    const mongoSchedule = new MongoSchedule(scheduleId, connection, pingIntervalMs);

    mongoSchedule.schedulePing.start();

    return mongoSchedule;
  }

  /**
   * Cancels all jobs on the schedule and disconnects the database.
   */
  public async disconnect(): Promise<void> {
    await this.cancel();
    await this.schedulePing.stop();
    await this.disconnectFct();
  }
}
