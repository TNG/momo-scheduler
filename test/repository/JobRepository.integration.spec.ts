import { DateTime } from 'luxon';
import { MongoMemoryServer } from 'mongodb-memory-server';

import { Connection } from '../../src/Connection';
import { ExecutionInfo, ExecutionStatus } from '../../src';
import { JobEntity } from '../../src/repository/JobEntity';
import { JobRepository } from '../../src/repository/JobRepository';
import { ParsedIntervalSchedule, toJobDefinition, tryToIntervalJob } from '../../src/job/Job';
import { CronSchedule } from '../../src/job/MomoJob';

describe('JobRepository', () => {
  const job = tryToIntervalJob({
    name: 'test job',
    schedule: { interval: 'one minute' },
    handler: () => undefined,
  });
  const jobDefinition = toJobDefinition(job);

  let mongo: MongoMemoryServer;
  let connection: Connection;
  let jobRepository: JobRepository;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    connection = await Connection.create({ url: mongo.getUri() });
    jobRepository = connection.getJobRepository();
  });

  beforeEach(async () => jobRepository.delete());

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
    it('saves a job', async () => {
      await jobRepository.define(job);

      expect(await jobRepository.find({ name: job.name })).toEqual([{ ...jobDefinition, _id: expect.anything() }]);
    });

    it('updates a job', async () => {
      await jobRepository.save(jobDefinition);

      const newSchedule = { ...job.schedule, interval: '2 minutes' };
      await jobRepository.define({ ...job, schedule: newSchedule });

      expect(await jobRepository.find({ name: job.name })).toEqual([
        { ...jobDefinition, schedule: newSchedule, _id: expect.anything() },
      ]);
    });

    it('cleans up duplicate jobs but keeps latest job', async () => {
      const latest = { ...jobDefinition, executionInfo: { lastFinished: DateTime.now().toISO() } as ExecutionInfo };
      await jobRepository.save(jobDefinition);
      await jobRepository.save(latest);

      const newSchedule = { ...job.schedule, interval: 'two minutes' };
      await jobRepository.define({ ...job, schedule: newSchedule });

      const actual = await jobRepository.find({ name: job.name });
      expect(actual).toEqual([
        {
          ...latest,
          schedule: newSchedule,
          _id: expect.anything(),
        },
      ]);
    });
  });

  describe('list', () => {
    it('returns jobs', async () => {
      const job1: JobEntity<ParsedIntervalSchedule> = {
        name: 'job1',
        schedule: {
          interval: '1 minute',
          parsedInterval: 60_000,
          firstRunAfter: 0,
          parsedFirstRunAfter: 0,
        },
        executionInfo: {} as ExecutionInfo,
        concurrency: 1,
        maxRunning: 3,
      };
      const job2: JobEntity<CronSchedule> = {
        name: 'job2',
        schedule: {
          cronSchedule: '0 9 * * 1-5',
        },
        executionInfo: {} as ExecutionInfo,
        concurrency: 1,
        maxRunning: 0,
      };
      await jobRepository.save(job1);
      await jobRepository.save(job2);

      const jobs = await jobRepository.list();

      const { interval, firstRunAfter } = job1.schedule;

      expect(jobs).toEqual([
        {
          name: job1.name,
          schedule: { interval, firstRunAfter },
          concurrency: job1.concurrency,
          maxRunning: job1.maxRunning,
          executionInfo: {},
        },
        {
          name: job2.name,
          schedule: job2.schedule,
          concurrency: job2.concurrency,
          maxRunning: job2.maxRunning,
          executionInfo: {},
        },
      ]);
    });
  });

  describe('updateJob', () => {
    it('does not overwrite executionInfo', async () => {
      const savedJob = {
        ...jobDefinition,
        executionInfo: {
          lastStarted: DateTime.now().toISO(),
          lastFinished: DateTime.now().toISO(),
          lastResult: { status: ExecutionStatus.finished, handlerResult: 'I was executed' },
        },
      };
      await jobRepository.save(savedJob);

      await jobRepository.updateJob(job.name, {
        schedule: {
          interval: 'two minutes',
          firstRunAfter: 0,
          parsedInterval: 120_000,
          parsedFirstRunAfter: 0,
        },
      });

      const jobs = await jobRepository.find({ name: job.name });
      expect(jobs[0]?.executionInfo).toEqual(savedJob.executionInfo);
    });

    it('can update maxRunning to 0', async () => {
      const savedJob = toJobDefinition({ ...job, maxRunning: 3 });
      await jobRepository.save(savedJob);

      await jobRepository.updateJob(job.name, { maxRunning: 0 });

      const jobs = await jobRepository.find({ name: job.name });
      expect(jobs[0]?.maxRunning).toBe(0);
    });
  });
});
