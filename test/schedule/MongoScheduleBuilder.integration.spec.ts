import { MongoMemoryServer } from 'mongodb-memory-server';

import { Connection } from '../../src/Connection';
import { MomoJob, MomoOptions, MongoSchedule, MongoScheduleBuilder } from '../../src';

describe('MongoScheduleBuilder', () => {
  const scheduleName = 'schedule';
  const job1: MomoJob = {
    name: 'test job 1',
    schedule: { interval: 'one minute', firstRunAfter: 0 },
    handler: jest.fn(),
  };

  const job2: MomoJob = {
    name: 'test job 2',
    schedule: { cronSchedule: '0 * * * *' },
    handler: jest.fn(),
  };

  const job3: MomoJob = {
    name: 'test job 3',
    schedule: { interval: 'one day', firstRunAfter: 0 },
    handler: jest.fn(),
  };

  let mongo: MongoMemoryServer;
  let connectionOptions: MomoOptions;
  let connection: Connection;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    connectionOptions = { scheduleName, url: mongo.getUri() };
    connection = await Connection.create(connectionOptions, 60_000, 'schedule_id', scheduleName);
  });

  afterAll(async () => {
    await mongo.stop();
    await connection.disconnect();
  });

  describe('build a mongoSchedule', () => {
    let mongoSchedule: MongoSchedule;

    afterEach(async () => {
      await connection.getJobRepository().delete();
      await connection.getSchedulesRepository().delete();
      await mongoSchedule.disconnect();
    });

    it('can build with one job and a connection', async () => {
      mongoSchedule = await new MongoScheduleBuilder().withJob(job1).withConnection(connectionOptions).build();

      const jobList = await mongoSchedule.list();
      expect(jobList).toHaveLength(1);
      expect(jobList[0]?.name).toEqual(job1.name);
      expect(jobList[0]?.schedule).toEqual(job1.schedule);
    });

    it('can build without a job', async () => {
      mongoSchedule = await new MongoScheduleBuilder().withConnection(connectionOptions).build();

      const jobList = await mongoSchedule.list();
      expect(jobList).toHaveLength(0);
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
      expect(jobList[0]?.schedule).toEqual(job1.schedule);
      expect(jobList[1]?.name).toEqual(job2.name);
      expect(jobList[1]?.schedule).toEqual(job2.schedule);
      expect(jobList[2]?.name).toEqual(job3.name);
      expect(jobList[2]?.schedule).toEqual(job3.schedule);
    });
  });

  it('throws an error when built with no connection', async () => {
    const mongoScheduleBuilder = new MongoScheduleBuilder().withJob(job1);

    await expect(mongoScheduleBuilder.build()).rejects.toThrow(
      'Error: MongoSchedule must be built with defined ConnectionOptions'
    );
  });
});
