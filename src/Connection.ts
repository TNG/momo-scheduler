import { MongoClient } from 'mongodb';

import { ExecutionsRepository } from './repository/ExecutionsRepository';
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
  private executionsRepository?: ExecutionsRepository;
  private jobRepository?: JobRepository;

  constructor(private readonly mongoClient: MongoClient, private readonly collectionsPrefix?: string) {}

  static async create({ url, collectionsPrefix }: MomoConnectionOptions): Promise<Connection> {
    const connection = new Connection(new MongoClient(url), collectionsPrefix);

    await connection.connect();

    return connection;
  }

  getExecutionsRepository(deadExecutionsThreshold = 60 * 1000): ExecutionsRepository {
    if (!this.executionsRepository) {
      this.executionsRepository = new ExecutionsRepository(
        this.mongoClient,
        deadExecutionsThreshold,
        this.collectionsPrefix
      );
    }
    return this.executionsRepository;
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
