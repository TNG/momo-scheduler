import { MongoMemoryServer } from 'mongodb-memory-server';

import { Connection } from '../../src/Connection';
import { MomoConnectionOptions, MomoJob, MongoSchedule } from '../../src';
import { MongoScheduleBuilder } from '../../src/schedule/MongoScheduleBuilder';

describe('MongoScheduleBuilder', () => {
  const job1: MomoJob = {
    name: 'test job 1',
    interval: 'one minute',
    handler: jest.fn(),
  };

  const job2: MomoJob = {
    name: 'test job 2',
    interval: 'one hour',
    handler: jest.fn(),
  };

  const job3: MomoJob = {
    name: 'test job 3',
    interval: 'one day',
    handler: jest.fn(),
  };

  let mongo: MongoMemoryServer;
  let connectionOptions: MomoConnectionOptions;
  let connection: Connection;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    connectionOptions = { url: mongo.getUri() };
    connection = await Connection.create(connectionOptions);
  });

  afterAll(async () => {
    await mongo.stop();
    await connection.disconnect();
  });

  describe('build a mongoSchedule', () => {
    let mongoSchedule: MongoSchedule;

    afterEach(async () => {
      await connection.getJobRepository().delete();
      await connection.getExecutionsRepository().delete();
      await mongoSchedule.disconnect();
    });

    it('can build with one job and a connection', async () => {
      mongoSchedule = await new MongoScheduleBuilder().withJob(job1).withConnection(connectionOptions).build();

      const jobList = await mongoSchedule.list();
      expect(jobList).toHaveLength(1);
      expect(jobList[0]?.name).toEqual(job1.name);
      expect(jobList[0]?.interval).toEqual(job1.interval);
    });

    it('can build with multiple jobs and a connection', async () => {
      mongoSchedule = await new MongoScheduleBuilder()
        .withJob(job1)
        .withJob(job2)
        .withJob(job3)
        .withConnection(connectionOptions)
        .build();

      const jobList = await mongoSchedule.list();
      expect(jobList).toHaveLength(3);
      expect(jobList[0]?.name).toEqual(job1.name);
      expect(jobList[0]?.interval).toEqual(job1.interval);
      expect(jobList[1]?.name).toEqual(job2.name);
      expect(jobList[1]?.interval).toEqual(job2.interval);
      expect(jobList[2]?.name).toEqual(job3.name);
      expect(jobList[2]?.interval).toEqual(job3.interval);
    });
  });

  it('throws an error when built with no connection', async () => {
    const mongoScheduleBuilder = new MongoScheduleBuilder().withJob(job1);

    await expect(mongoScheduleBuilder.build()).rejects.toThrowError(
      'Error: MongoSchedule must be built with defined ConnectionOptions'
    );
  });

  it('throws an error when built with no jobs', async () => {
    const mongoScheduleBuilder = new MongoScheduleBuilder().withConnection(connectionOptions);

    await expect(mongoScheduleBuilder.build()).rejects.toThrowError(
      'Error: MongoSchedule must be built with at least one defined job'
    );
  });
});
