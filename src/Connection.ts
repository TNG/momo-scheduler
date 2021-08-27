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
    const mongoClient = await MongoClient.connect(connectionOptions.url);

    await mongoClient.db().collection(JOBS_COLLECTION_NAME).createIndex({ name: 1 }, { name: 'job_name_index' });
    await mongoClient
      .db()
      .collection(JOBS_COLLECTION_NAME)
      .createIndex({ scheduleId: 1 }, { name: 'schedule_id_index' });

    return new Connection(mongoClient);
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

  // TODO connection instance unusable after calling disconnect
}
