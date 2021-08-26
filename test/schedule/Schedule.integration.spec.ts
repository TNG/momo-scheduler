import { MongoMemoryServer } from 'mongodb-memory-server';

import { clear, MomoJob, MongoSchedule } from '../../src';
import { JobRepository } from '../../src/repository/JobRepository';
import { getJobRepository } from '../../src/repository/getRepository';
import { initLoggingForTests } from '../utils/logging';
import { fromMomoJob } from '../../src/job/Job';

describe('Schedule', () => {
  const job: MomoJob = {
    name: 'test job',
    interval: 'one minute',
    handler: jest.fn(),
  };

  let mongo: MongoMemoryServer;
  let jobRepository: JobRepository;
  let mongoSchedule: MongoSchedule;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    mongoSchedule = await MongoSchedule.connect({ url: await mongo.getUri() });
    jobRepository = getJobRepository();

    initLoggingForTests(mongoSchedule);
  });

  beforeEach(async () => {
    await mongoSchedule.cancel();
    await clear();
  });

  afterAll(async () => {
    await mongoSchedule.disconnect();
    await mongo.stop();
  });

  it('saves job with defaults and returns description of jobs on the schedule', async () => {
    await mongoSchedule.define(job);

    expect(await mongoSchedule.get(job.name)).toEqual({
      name: job.name,
      interval: job.interval,
      concurrency: 1,
      maxRunning: 0,
    });
  });

  it('updates job', async () => {
    await mongoSchedule.define(job);

    const newInterval = 'two minutes';
    await mongoSchedule.define({ ...job, interval: newInterval });

    expect(await mongoSchedule.get(job.name)).toEqual({
      name: job.name,
      interval: newInterval,
      concurrency: 1,
      maxRunning: 0,
    });
  });

  it('lists jobs on the schedule', async () => {
    await jobRepository.save(
      fromMomoJob({
        name: 'some job that is in the database but not on the schedule',
        handler: jest.fn(),
        interval: 'one minute',
      })
    );

    await mongoSchedule.define(job);

    expect(await mongoSchedule.list()).toEqual([
      { name: job.name, interval: job.interval, concurrency: 1, maxRunning: 0 },
    ]);
  });

  it('cancels jobs without removing them from the database', async () => {
    await mongoSchedule.define(job);
    await mongoSchedule.cancel();

    expect(await mongoSchedule.get(job.name)).toBeUndefined();
    expect(await jobRepository.find({})).toHaveLength(1);
  });

  it('cancels a job without removing it from the database', async () => {
    const jobToKeep = { ...job, name: 'keep me' };
    await mongoSchedule.define(jobToKeep);
    await mongoSchedule.define(job);

    await mongoSchedule.cancelJob(job.name);

    const jobs = await mongoSchedule.list();
    expect(jobs).toHaveLength(1);
    expect(jobs[0].name).toEqual(jobToKeep.name);

    const jobEntities = await jobRepository.find({});
    expect(jobEntities).toHaveLength(2);
  });

  it('removes jobs', async () => {
    await mongoSchedule.define(job);
    await mongoSchedule.remove();

    expect(await mongoSchedule.get(job.name)).toBeUndefined();
    expect(await jobRepository.find({})).toHaveLength(0);
  });

  it('removes a job', async () => {
    await mongoSchedule.define(job);

    const jobToKeep = { ...job, name: 'keep me' };
    await mongoSchedule.define(jobToKeep);

    await mongoSchedule.removeJob(job.name);

    expect(await mongoSchedule.get(job.name)).toEqual(undefined);

    const jobEntities = await jobRepository.find({});
    expect(jobEntities).toHaveLength(1);
    expect(jobEntities[0].name).toEqual(jobToKeep.name);
  });
});
