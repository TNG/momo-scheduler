import { JOBS_COLLECTION_NAME } from './repository/JobRepository';
import { MongoClient } from 'mongodb';

let mongoClient: MongoClient | undefined;

export interface MomoConnectionOptions {
  url: string;
}

export function connectForTest(testClient: MongoClient): void {
  mongoClient = testClient;
}

export async function connect(connectionOptions: MomoConnectionOptions): Promise<MongoClient> {
  if (mongoClient !== undefined) {
    return mongoClient;
  }

  mongoClient = await MongoClient.connect(connectionOptions.url);

  await mongoClient.db().collection(JOBS_COLLECTION_NAME).createIndex({ name: 1 }, { name: 'job_name_index' });
  await mongoClient.db().collection(JOBS_COLLECTION_NAME).createIndex({ scheduleId: 1 }, { name: 'schedule_id_index' });

  return mongoClient;
}

export async function disconnect(): Promise<void> {
  await mongoClient?.close();
}

export function getConnection(): MongoClient {
  if (mongoClient === undefined) {
    throw new Error('momo is not connected, please call connect() first');
  }
  return mongoClient;
}
