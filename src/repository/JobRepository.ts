import { MongoClient } from 'mongodb';
import { JobEntity } from './JobEntity';
import { Repository } from './Repository';

export const JOBS_COLLECTION_NAME = 'jobs';

export class JobRepository extends Repository<JobEntity> {
  constructor(mongoClient: MongoClient) {
    super(mongoClient, JOBS_COLLECTION_NAME);
  }

  async updateJob(name: string, update: Partial<JobEntity>): Promise<void> {
    await this.updateOne({ name }, { $set: update });
  }
}
