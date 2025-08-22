import { deepEqual, instance, mock, when } from 'ts-mockito';
import { ObjectId } from 'mongodb';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ExecutionStatus, MomoEvent, MomoJob, MomoOptions, MongoSchedule } from '../../src';
import { SchedulesRepository } from '../../src/repository/SchedulesRepository';
import { JobRepository } from '../../src/repository/JobRepository';
import { initLoggingForTests } from '../utils/logging';
import { toJobDefinition, tryToIntervalJob } from '../../src/job/Job';

const schedulesRepository = mock(SchedulesRepository);
const jobRepository = mock(JobRepository);
vi.mock('../../src/Connection', () => {
  return {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    Connection: {
      create: async (_options: MomoOptions) => {
        return {
          getJobRepository: () => instance(jobRepository),
          getSchedulesRepository: () => instance(schedulesRepository),
          disconnect: async () => undefined,
        };
      },
    },
  };
});

describe('Schedule', () => {
  const scheduleName = 'schedule';
  const momoJob: MomoJob = {
    name: 'test job',
    schedule: { interval: 'one minute', firstRunAfter: 0 },
    handler: vi.fn(),
  };
  const entityWithId = { _id: new ObjectId(), ...toJobDefinition(tryToIntervalJob(momoJob)._unsafeUnwrap()) };

  let mongoSchedule: MongoSchedule;

  beforeEach(async () => {
    vi.clearAllMocks();

    when(jobRepository.find(deepEqual({ name: momoJob.name }))).thenResolve([]);
    when(schedulesRepository.setActiveSchedule()).thenResolve(true);

    mongoSchedule = await MongoSchedule.connect({ scheduleName, url: 'mongodb://does.not/matter' });
    initLoggingForTests(mongoSchedule);
  });

  afterEach(async () => {
    await mongoSchedule.disconnect();
  });

  it('emits logs', async () => {
    const caughtEvents: string[] = [];
    const caughtErrors: string[] = [];
    mongoSchedule.on('debug', (event: MomoEvent) => caughtEvents.push(event.message));
    mongoSchedule.on('error', (event: MomoEvent) => caughtErrors.push(event.message));

    await mongoSchedule.start();

    expect(caughtEvents).toEqual([
      'starting the schedule',
      'This schedule is active',
      'This schedule just turned active',
      'Finished starting scheduled jobs',
    ]);
    expect(caughtErrors).toEqual([]);
  });

  it('successfully defines a job when concurrency > 0 and maxRunning is not set', async () => {
    const defined = await mongoSchedule.define({ ...momoJob, concurrency: 3 });

    expect(defined).toBe(true);
  });

  describe('run', () => {
    it('runs a job once', async () => {
      await mongoSchedule.define(momoJob);

      when(jobRepository.findOne(deepEqual({ name: momoJob.name }))).thenResolve(entityWithId);
      when(schedulesRepository.addExecution(momoJob.name, 0)).thenResolve({ added: true, running: 0 });

      const result = await mongoSchedule.run(momoJob.name);

      expect(result).toEqual({ status: ExecutionStatus.finished, handlerResult: 'finished' });
      expect(momoJob.handler).toHaveBeenCalledTimes(1);
    });

    it('runs a job once after delay', async () => {
      await mongoSchedule.define(momoJob);

      when(jobRepository.findOne(deepEqual({ name: momoJob.name }))).thenResolve(entityWithId);
      when(schedulesRepository.addExecution(momoJob.name, 0)).thenResolve({ added: true, running: 0 });

      const result = await mongoSchedule.run(momoJob.name, undefined, 500);

      expect(result).toEqual({ status: ExecutionStatus.finished, handlerResult: 'finished' });
      expect(momoJob.handler).toHaveBeenCalledTimes(1);
    });

    it('runs a "never" job once', async () => {
      await mongoSchedule.define({ ...momoJob, schedule: { interval: 'never' } });

      when(jobRepository.findOne(deepEqual({ name: momoJob.name }))).thenResolve(entityWithId);
      when(schedulesRepository.addExecution(momoJob.name, 0)).thenResolve({ added: true, running: 0 });

      const result = await mongoSchedule.run(momoJob.name);

      expect(result).toEqual({ status: ExecutionStatus.finished, handlerResult: 'finished' });
      expect(momoJob.handler).toHaveBeenCalledTimes(1);
    });

    it('does not run job once when job is not found', async () => {
      const result = await mongoSchedule.run('not defined');

      expect(result).toEqual({ status: ExecutionStatus.notFound });
    });

    it('skips running job once when job is not found in repository', async () => {
      await mongoSchedule.define(momoJob);

      when(jobRepository.findOne(deepEqual({ name: momoJob.name }))).thenResolve(undefined);

      const result = await mongoSchedule.run(momoJob.name);

      expect(result).toEqual({ status: ExecutionStatus.notFound });
    });

    it('skips running job once when maxRunning is reached', async () => {
      await mongoSchedule.define(momoJob);

      when(jobRepository.findOne(deepEqual({ name: momoJob.name }))).thenResolve(entityWithId);
      when(schedulesRepository.addExecution(momoJob.name, 0)).thenResolve({
        added: false,
        running: 0,
      });

      const result = await mongoSchedule.run(momoJob.name);

      expect(result).toEqual({ status: ExecutionStatus.maxRunningReached });
      expect(momoJob.handler).toHaveBeenCalledTimes(0);
    });
  });

  it('counts jobs', async () => {
    await mongoSchedule.define(momoJob);

    expect(mongoSchedule.count()).toBe(1);
  });
});
