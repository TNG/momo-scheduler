import { v4 as uuid } from 'uuid';

import { Connection, MomoConnectionOptions } from '../Connection';
import { ExecutionsRepository } from '../repository/ExecutionsRepository';
import { JobRepository } from '../repository/JobRepository';
import { Schedule } from './Schedule';
import { SchedulePing } from './SchedulePing';

export class MongoSchedule extends Schedule {
  private readonly schedulePing: SchedulePing;

  private constructor(
    scheduleId: string,
    private readonly disconnectFct: () => Promise<void>,
    executionsRepository: ExecutionsRepository,
    jobRepository: JobRepository
  ) {
    super(scheduleId, executionsRepository, jobRepository);
    this.schedulePing = new SchedulePing(scheduleId, executionsRepository, this.logger);
  }

  /**
   * Creates a MongoSchedule that is connected to the MongoDB with the provided url.
   *
   * @param connectionOptions for the MongoDB connection to establish
   */
  public static async connect(connectionOptions: MomoConnectionOptions): Promise<MongoSchedule> {
    const connection = await Connection.create(connectionOptions);

    const executionsRepository = connection.getExecutionsRepository();
    const jobRepository = connection.getJobRepository();

    const scheduleId = uuid();
    await executionsRepository.addSchedule(scheduleId);

    const mongoSchedule = new MongoSchedule(
      scheduleId,
      connection.disconnect.bind(connection),
      executionsRepository,
      jobRepository
    );

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
