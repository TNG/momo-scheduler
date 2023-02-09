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
  private schedulesRepository?: SchedulesRepository;
  private jobRepository?: JobRepository;

  constructor(
    private readonly mongoClient: MongoClient,
    private readonly pingIntervalMs: number,
    private readonly scheduleId: string,
    private readonly collectionsPrefix?: string
  ) {}

  static async create(
    { url, collectionsPrefix }: MomoConnectionOptions,
    pingIntervalMs: number,
    scheduleId: string
  ): Promise<Connection> {
    const connection = new Connection(new MongoClient(url), pingIntervalMs, scheduleId, collectionsPrefix);

    await connection.mongoClient.connect();

    const schedulesRepository = connection.getSchedulesRepository();
    await schedulesRepository.createIndex();
    const jobRepository = connection.getJobRepository();
    await jobRepository.createIndex();

    return connection;
  }

  getSchedulesRepository(): SchedulesRepository {
    if (!this.schedulesRepository) {
      this.schedulesRepository = new SchedulesRepository(
        this.mongoClient,
        2 * this.pingIntervalMs,
        this.scheduleId,
        this.collectionsPrefix
      );
    }
    return this.schedulesRepository;
  }

  getJobRepository(): JobRepository {
    if (!this.jobRepository) {
      this.jobRepository = new JobRepository(this.mongoClient, this.collectionsPrefix);
    }
    return this.jobRepository;
  }

  async disconnect(): Promise<void> {
    await this.mongoClient.close();
  }
}
