import { DateTime } from 'luxon';
import { MongoMemoryServer } from 'mongodb-memory-server';

import { Connection } from '../../src/Connection';
import { ExecutionInfo, ExecutionStatus, MomoJob } from '../../src';
import { JobEntity } from '../../src/repository/JobEntity';
import { JobRepository } from '../../src/repository/JobRepository';
import { createJobEntity } from '../../src/repository/createJobEntity';
import { fromMomoJob } from '../../src/job/Job';

describe('JobRepository', () => {
  const job: MomoJob = {
    name: 'test job',
    interval: 'one minute',
    handler: () => undefined,
  };
  let mongo: MongoMemoryServer;
  let connection: Connection;
  let jobRepository: JobRepository;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    connection = await Connection.create({ url: mongo.getUri() });
    jobRepository = connection.getJobRepository();
  });

  beforeEach(async () => jobRepository.deleteOne({}));

  afterAll(async () => {
    await connection.disconnect();
    await mongo.stop();
  });

  describe('check', () => {
    const name = 'test';

    it('returns executionInfo', async () => {
      const executionInfo: ExecutionInfo = {
        lastStarted: DateTime.now().toISO(),
        lastFinished: DateTime.now().toISO(),
        lastResult: { status: ExecutionStatus.finished },
      };
      await jobRepository.save({ name, executionInfo } as JobEntity);

      const result = await jobRepository.check(name);

      expect(result).toEqual(executionInfo);
    });

    it('returns nothing if job not found', async () => {
      expect(await jobRepository.check(name)).toBeUndefined();
    });
  });

  describe('define', () => {
    jest.setTimeout(1000000);
    const job: MomoJob = { name: 'test', interval: '1 minute', handler: () => 'finished' };

    it('saves a job', async () => {
      await jobRepository.define(fromMomoJob(job));

      expect(await jobRepository.find({ name: job.name })).toEqual([
        { ...createJobEntity(job), _id: expect.anything() },
      ]);
    });

    it('updates a job', async () => {
      await jobRepository.save(createJobEntity(job));

      const newInterval = '2 minutes';
      await jobRepository.define(fromMomoJob({ ...job, interval: newInterval }));

      expect(await jobRepository.find({ name: job.name })).toEqual([
        { ...createJobEntity(job), interval: newInterval, _id: expect.anything() },
      ]);
    });

    it('cleans up duplicate jobs but keeps latest job', async () => {
      const duplicate = createJobEntity(job);
      const latest = createJobEntity(job);
      latest.executionInfo = { lastFinished: DateTime.now().toISO() } as ExecutionInfo;
      await jobRepository.save(duplicate);
      await jobRepository.save(latest);

      const newInterval = 'two minutes';
      await jobRepository.define(fromMomoJob({ ...job, interval: newInterval }));

      expect(await jobRepository.find({ name: job.name })).toEqual([
        { ...createJobEntity(job), interval: newInterval, executionInfo: latest.executionInfo, _id: expect.anything() },
      ]);
    });
  });

  describe('list', () => {
    it('returns jobs', async () => {
      const job1 = {
        name: 'job1',
        interval: '1 minute',
        executionInfo: {} as ExecutionInfo,
        running: 2,
        concurrency: 1,
        maxRunning: 3,
      };
      const job2 = {
        name: 'job2',
        interval: '2 minutes',
        executionInfo: {} as ExecutionInfo,
        running: 0,
        concurrency: 1,
        maxRunning: 0,
      };
      await jobRepository.save(job1);
      await jobRepository.save(job2);

      const jobs = await jobRepository.list();

      expect(jobs).toEqual([
        {
          name: job1.name,
          interval: job1.interval,
          concurrency: job1.concurrency,
          maxRunning: job1.maxRunning,
          executionInfo: {},
        },
        {
          name: job2.name,
          interval: job2.interval,
          concurrency: job2.concurrency,
          maxRunning: job2.maxRunning,
          executionInfo: {},
        },
      ]);
    });
  });

  describe('updateJob', () => {
    it('does not overwrite executionInfo', async () => {
      const savedJob = createJobEntity(job);
      savedJob.executionInfo = {
        lastStarted: DateTime.now().toISO(),
        lastFinished: DateTime.now().toISO(),
        lastResult: { status: ExecutionStatus.finished, handlerResult: 'I was executed' },
      };
      await jobRepository.save(savedJob);

      await jobRepository.updateJob(job.name, { interval: 'new interval' });

      const jobs = await jobRepository.find({ name: job.name });
      expect(jobs[0]?.executionInfo).toEqual(savedJob.executionInfo);
    });

    it('can update maxRunning to 0', async () => {
      const savedJob = createJobEntity({ ...job, maxRunning: 3 });
      await jobRepository.save(savedJob);

      await jobRepository.updateJob(job.name, { maxRunning: 0 });

      const jobs = await jobRepository.find({ name: job.name });
      expect(jobs[0]?.maxRunning).toBe(0);
    });
  });
});
