import { MongoClient, type MongoClientOptions } from 'mongodb';
import { Connection } from '../src/Connection';

jest.mock('mongodb');
jest.mock('../src/repository/JobRepository');
jest.mock('../src/repository/SchedulesRepository');

describe('Connection', () => {
  const scheduleName = 'schedule';
  const scheduleId = 'scheduleId';
  const url = 'connection-string-to-db';

  it('should use provided options for the connection to the mongo client', async () => {
    const mongoClientOptions: MongoClientOptions = {
      tls: true,
      secureContext: { context: 'very secure' },
    };

    await Connection.create(
      { url, mongoClientOptions },
      0,
      scheduleId,
      scheduleName,
    );

    expect(MongoClient).toHaveBeenCalledTimes(1);
    expect(MongoClient).toHaveBeenCalledWith(url, mongoClientOptions);
  });
});
