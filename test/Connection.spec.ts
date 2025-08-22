import { Connection } from '../src/Connection';
import { MongoClient, MongoClientOptions } from 'mongodb';
import { describe, expect, it, vi } from 'vitest';

vi.mock('mongodb');
vi.mock('../src/repository/JobRepository');
vi.mock('../src/repository/SchedulesRepository');

describe('Connection', () => {
  const scheduleName = 'schedule';
  const scheduleId = 'scheduleId';
  const url = 'connection-string-to-db';

  it('should use provided options for the connection to the mongo client', async () => {
    const mongoClientOptions: MongoClientOptions = {
      tls: true,
      secureContext: { context: 'very secure' },
    };

    await Connection.create({ url, mongoClientOptions }, 0, scheduleId, scheduleName);

    expect(MongoClient).toHaveBeenCalledTimes(1);
    expect(MongoClient).toHaveBeenCalledWith(url, mongoClientOptions);
  });
});
