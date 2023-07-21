import { MongoClient } from 'mongodb';

import { SchedulesRepository } from './repository/SchedulesRepository';
import { JobRepository } from './repository/JobRepository';

export interface MomoConnectionOptions {
  /**
   * The mongodb connection string.
   */
  url: string;
  /**
   * Used to prefix all mongodb collections created by Momo.
   */
  collectionsPrefix?: string;
}

export class Connection {
  private constructor(
    private readonly mongoClient: MongoClient,
    private readonly schedulesRepository: SchedulesRepository,
    private readonly jobRepository: JobRepository,
  ) {}

  static async create(
    { url, collectionsPrefix }: MomoConnectionOptions,
    pingIntervalMs: number,
    scheduleId: string,
    scheduleName: string,
  ): Promise<Connection> {
    const mongoClient = new MongoClient(url);
    await mongoClient.connect();

    const schedulesRepository = new SchedulesRepository(
      mongoClient,
      2 * pingIntervalMs,
      scheduleId,
      scheduleName,
      collectionsPrefix,
    );
    await schedulesRepository.createIndex();
    const jobRepository = new JobRepository(mongoClient, collectionsPrefix);
    await jobRepository.createIndex();

    return new Connection(mongoClient, schedulesRepository, jobRepository);
  }

  getSchedulesRepository(): SchedulesRepository {
    return this.schedulesRepository;
  }

  getJobRepository(): JobRepository {
    return this.jobRepository;
  }

  async disconnect(): Promise<void> {
    await this.mongoClient.close();
  }
}
