import { MongoClient } from 'mongodb';

import { ExecutionsRepository } from './repository/ExecutionsRepository';
import { JOBS_COLLECTION_NAME, JobRepository } from './repository/JobRepository';

export interface MomoConnectionOptions {
  url: string;
}

export class Connection {
  private executionsRepository?: ExecutionsRepository;
  private jobRepository?: JobRepository;

  constructor(private readonly mongoClient: MongoClient) {}

  static async create(connectionOptions: MomoConnectionOptions): Promise<Connection> {
    const connection = new Connection(new MongoClient(connectionOptions.url));

    await connection.connect();

    return connection;
  }

  getExecutionsRepository(): ExecutionsRepository {
    if (this.executionsRepository === undefined) {
      this.executionsRepository = new ExecutionsRepository(this.mongoClient);
    }
    return this.executionsRepository;
  }

  getJobRepository(): JobRepository {
    if (this.jobRepository === undefined) {
      this.jobRepository = new JobRepository(this.mongoClient);
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
