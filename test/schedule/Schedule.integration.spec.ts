import { MongoMemoryServer } from 'mongodb-memory-server';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { Connection } from '../../src/Connection';
import { JobRepository } from '../../src/repository/JobRepository';
import { MomoJob, MongoSchedule } from '../../src';
import { initLoggingForTests } from '../utils/logging';
import { tryToIntervalJob } from '../../src/job/Job';

describe('Schedule', () => {
  const job: MomoJob = {
    name: 'test job',
    schedule: { interval: 'one minute', firstRunAfter: 0 },
    handler: vi.fn(),
    parameters: { foo: 'bar' },
  };

  let mongo: MongoMemoryServer;
  let connection: Connection;
  let jobRepository: JobRepository;
  let mongoSchedule: MongoSchedule;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    connection = await Connection.create({ url: mongo.getUri() }, 60_000, 'schedule_id', 'testSchedule');
    jobRepository = connection.getJobRepository();

    mongoSchedule = await MongoSchedule.connect({ scheduleName: 'schedule', url: mongo.getUri() });

    initLoggingForTests(mongoSchedule);
  });

  beforeEach(async () => {
    await mongoSchedule.cancel();
    await mongoSchedule.clear();
  });

  afterAll(async () => {
    await mongoSchedule.disconnect();
    await connection.disconnect();
    await mongo.stop();
  });

  it('saves job with defaults and returns description of jobs on the schedule', async () => {
    await mongoSchedule.define(job);

    expect(await mongoSchedule.get(job.name)).toEqual({
      name: job.name,
      schedule: job.schedule,
      parameters: job.parameters,
      concurrency: 1,
      maxRunning: 0,
    });
  });

  it('updates job', async () => {
    await mongoSchedule.define(job);

    const newSchedule = { ...job.schedule, interval: 'two minutes' };
    await mongoSchedule.define({ ...job, schedule: newSchedule });

    expect(await mongoSchedule.get(job.name)).toEqual({
      name: job.name,
      schedule: newSchedule,
      parameters: job.parameters,
      concurrency: 1,
      maxRunning: 0,
    });
  });

  it('lists jobs on the schedule', async () => {
    await jobRepository.save(
      tryToIntervalJob({
        name: 'some job that is in the database but not on the schedule',
        handler: vi.fn(),
        schedule: { interval: 'one minute', firstRunAfter: 0 },
      })._unsafeUnwrap(),
    );

    await mongoSchedule.define(job);

    expect(await mongoSchedule.list()).toEqual([
      { name: job.name, schedule: job.schedule, parameters: job.parameters, concurrency: 1, maxRunning: 0 },
    ]);
  });

  it('cancels jobs without removing them from the database', async () => {
    await mongoSchedule.define(job);
    await mongoSchedule.cancel();

    expect(await mongoSchedule.get(job.name)).toBeUndefined();
    expect(await jobRepository.find({})).toHaveLength(1);
  });

  it('removes jobs', async () => {
    await mongoSchedule.define(job);
    await mongoSchedule.remove();

    expect(await mongoSchedule.get(job.name)).toBeUndefined();
    expect(await jobRepository.find({})).toHaveLength(0);
  });
});
