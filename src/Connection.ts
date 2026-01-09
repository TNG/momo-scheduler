import { MongoClient, type MongoClientOptions } from 'mongodb';
import { JobRepository } from './repository/JobRepository';
import { SchedulesRepository } from './repository/SchedulesRepository';

export interface MomoConnectionOptions {
  /**
   * The mongodb connection string.
   */
  url: string;
  /**
   * Additional options for the connection to the Mongo client.
   * Refer to MongoClientOptions in the MongoDB API documentation for a list of all available settings.
   * Useful for providing configuration options that are not available via the connection string (url).
   */
  mongoClientOptions?: MongoClientOptions;
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
    { url, mongoClientOptions, collectionsPrefix }: MomoConnectionOptions,
    pingIntervalMs: number,
    scheduleId: string,
    scheduleName: string,
  ): Promise<Connection> {
    const mongoClient = new MongoClient(url, mongoClientOptions);
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
