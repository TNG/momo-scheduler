import { MongoClient } from 'mongodb';

import { SchedulesRepository } from './repository/SchedulesRepository';
import { JOBS_COLLECTION_NAME, JobRepository } from './repository/JobRepository';

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

  constructor(private readonly mongoClient: MongoClient, private readonly collectionsPrefix?: string) {}

  static async create({ url, collectionsPrefix }: MomoConnectionOptions): Promise<Connection> {
    const connection = new Connection(new MongoClient(url), collectionsPrefix);

    await connection.connect();

    return connection;
  }

  getSchedulesRepository(deadScheduleThreshold = 2 * 60 * 1000, scheduleId: string): SchedulesRepository {
    if (!this.schedulesRepository) {
      this.schedulesRepository = new SchedulesRepository(
        this.mongoClient,
        deadScheduleThreshold,
        scheduleId,
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

  async connect(): Promise<void> {
    await this.mongoClient.connect();

    await this.mongoClient.db().collection(JOBS_COLLECTION_NAME).createIndex({ name: 1 }, { name: 'job_name_index' });
    await this.mongoClient
      .db()
      .collection(JOBS_COLLECTION_NAME)
      .createIndex({ scheduleId: 1 }, { name: 'schedule_id_index' });
  }
}
