import { ObjectId, type WithId } from 'mongodb';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { JobExecutor } from '../../src/executor/JobExecutor.js';
import { MomoErrorType, momoError } from '../../src/index.js';
import {
  type JobDefinition,
  type ParsedIntervalSchedule,
  toJobDefinition,
} from '../../src/job/Job.js';
import type { CronSchedule, NeverSchedule } from '../../src/job/MomoJob.js';
import type { JobEntity } from '../../src/repository/JobEntity.js';
import type { JobRepository } from '../../src/repository/JobRepository.js';
import type { SchedulesRepository } from '../../src/repository/SchedulesRepository.js';
import { JobScheduler } from '../../src/scheduler/JobScheduler.js';
import { createMock } from '../utils/createMock.js';
import { loggerForTests } from '../utils/logging.js';
import { sleep } from '../utils/sleep.js';

describe('JobScheduler', () => {
  const debugFn = vi.fn();
  const errorFn = vi.fn();

  let schedulesRepositoryMock: ReturnType<
    typeof createMock<SchedulesRepository>
  >;
  let jobRepositoryMock: ReturnType<typeof createMock<JobRepository>>;
  let jobExecutorMock: ReturnType<typeof createMock<JobExecutor>>;
  let jobScheduler: JobScheduler;

  beforeEach(() => {
    schedulesRepositoryMock = createMock<SchedulesRepository>();
    jobRepositoryMock = createMock<JobRepository>();
    jobExecutorMock = createMock<JobExecutor>();
    jobExecutorMock.stubs.execute.mockResolvedValue(undefined);
  });

  afterEach(async () => {
    await jobScheduler.stop();
  });

  function createJob<
    Schedule extends ParsedIntervalSchedule | CronSchedule | NeverSchedule,
  >(job: JobDefinition<Schedule>): JobDefinition<Schedule> {
    jobScheduler = new JobScheduler(
      job.name,
      jobExecutorMock.instance,
      schedulesRepositoryMock.instance,
      jobRepositoryMock.instance,
      loggerForTests(errorFn, debugFn),
    );
    const jobEntity: WithId<JobEntity> = {
      ...toJobDefinition(job),
      _id: new ObjectId(),
    };
    jobRepositoryMock.stubs.findOne.mockResolvedValue(jobEntity);
    schedulesRepositoryMock.stubs.countRunningExecutions.mockResolvedValue(0);
    return job;
  }

  function createNeverJob(
    partialJob: Partial<JobDefinition<NeverSchedule>> = {},
  ): JobDefinition<NeverSchedule> {
    const job: JobDefinition<NeverSchedule> = {
      name: 'never job',
      schedule: { interval: 'never' },
      concurrency: 1,
      maxRunning: 0,
      ...partialJob,
    };
    return createJob(job);
  }

  function createIntervalJob(
    partialJob: Partial<JobDefinition<ParsedIntervalSchedule>> = {},
  ): JobDefinition<ParsedIntervalSchedule> {
    const job = {
      name: 'interval job',
      schedule: {
        interval: '1 second',
        parsedInterval: 1000,
        firstRunAfter: 1000,
        parsedFirstRunAfter: 1000,
      },
      concurrency: 1,
      maxRunning: 0,
      ...partialJob,
    };
    return createJob(job);
  }

  function createCronJob(
    partialJob: Partial<JobDefinition<CronSchedule>> = {},
  ): JobDefinition<CronSchedule> {
    return createJob({
      name: 'cron job',
      schedule: { cronSchedule: '*/1 * * * * *' },
      concurrency: 1,
      maxRunning: 0,
      ...partialJob,
    });
  }

  describe('single never job', () => {
    it('does not start "never" job', async () => {
      const job = createNeverJob();
      await jobScheduler.start();

      expect(debugFn).toHaveBeenCalledWith(
        "do not start job specified to run 'never'",
        { name: job.name },
      );
    });
  });

  describe('single interval job', () => {
    it('executes a job', async () => {
      createIntervalJob();
      await jobScheduler.start();

      await sleep(1100);
      expect(jobExecutorMock.stubs.execute).toHaveBeenCalledTimes(1);
    });

    it('executes a job with the desired parameters', async () => {
      createIntervalJob({ parameters: { foo: 'bar' } });
      await jobScheduler.start();

      await sleep(1100);
      expect(jobExecutorMock.stubs.execute).toHaveBeenCalledWith(
        expect.anything(),
        { foo: 'bar' },
      );
    });

    it('executes a job with firstRunAfter=0 immediately', async () => {
      createIntervalJob({
        schedule: {
          interval: '1 second',
          parsedInterval: 60_000,
          firstRunAfter: 0,
          parsedFirstRunAfter: 0,
        },
      });

      await jobScheduler.start();

      await sleep(100);
      expect(jobExecutorMock.stubs.execute).toHaveBeenCalledTimes(1);
    });

    it('stops a job', async () => {
      createIntervalJob();
      await jobScheduler.start();

      await sleep(1100);
      expect(jobExecutorMock.stubs.execute).toHaveBeenCalledTimes(1);

      await jobScheduler.stop();

      await sleep(1100);
      expect(jobExecutorMock.stubs.execute).toHaveBeenCalledTimes(1);
    });

    it('returns job description', async () => {
      const job = createIntervalJob();

      const jobDescription = await jobScheduler.getJobDescription();
      expect(jobDescription).toEqual({
        name: job.name,
        schedule: {
          firstRunAfter: 1000,
          interval: '1 second',
        },
        concurrency: job.concurrency,
        maxRunning: job.maxRunning,
      });
    });

    it('returns job description for started job', async () => {
      const job = createIntervalJob();
      await jobScheduler.start();

      const jobDescription = await jobScheduler.getJobDescription();
      expect(jobDescription).toEqual({
        name: job.name,
        concurrency: job.concurrency,
        maxRunning: job.maxRunning,
        schedule: {
          firstRunAfter: 1000,
          interval: '1 second',
        },
        schedulerStatus: {
          schedule: {
            firstRunAfter: 1000,
            interval: '1 second',
          },
          running: 0,
        },
      });
    });
  });

  describe('single cron job', () => {
    it('executes a job', async () => {
      createCronJob();
      await jobScheduler.start();

      await sleep(1000);
      expect(jobExecutorMock.stubs.execute).toHaveBeenCalledTimes(1);
    });

    it('executes a job with the desired parameters', async () => {
      createCronJob({ parameters: { foo: 'bar' } });
      await jobScheduler.start();

      await sleep(1000);
      expect(jobExecutorMock.stubs.execute).toHaveBeenCalledWith(
        expect.anything(),
        { foo: 'bar' },
      );
    });

    it('stops a job', async () => {
      createCronJob();
      await jobScheduler.start();

      await sleep(1000);
      expect(jobExecutorMock.stubs.execute).toHaveBeenCalledTimes(1);

      await jobScheduler.stop();

      await sleep(1000);
      expect(jobExecutorMock.stubs.execute).toHaveBeenCalledTimes(1);
    });

    it('returns job description', async () => {
      const job = createCronJob();

      const jobDescription = await jobScheduler.getJobDescription();
      expect(jobDescription).toEqual({
        name: job.name,
        concurrency: job.concurrency,
        maxRunning: job.maxRunning,
        schedule: { cronSchedule: '*/1 * * * * *' },
      });
    });

    it('returns job description for started job', async () => {
      const job = createCronJob();
      await jobScheduler.start();

      const jobDescription = await jobScheduler.getJobDescription();
      expect(jobDescription).toEqual({
        name: job.name,
        concurrency: job.concurrency,
        maxRunning: job.maxRunning,
        schedule: { cronSchedule: '*/1 * * * * *' },
        schedulerStatus: { schedule: job.schedule, running: 0 },
      });
    });
  });

  describe('error cases', () => {
    const timeout = 100;

    it('reports error when job was removed before scheduling', async () => {
      const job = createIntervalJob();
      jobRepositoryMock.stubs.findOne.mockResolvedValue(undefined);

      await jobScheduler.start();

      expect(errorFn).toHaveBeenCalledWith(
        'cannot schedule job',
        MomoErrorType.scheduleJob,
        { name: job.name },
        momoError.jobNotFound,
      );
    });

    it('reports unexpected error with mongo', async () => {
      const job = createIntervalJob();
      await jobScheduler.start();

      const error = new Error('something unexpected happened');
      jobRepositoryMock.stubs.findOne.mockRejectedValue(error);

      await sleep(1100);

      expect(errorFn).toHaveBeenCalledWith(
        'an unexpected error occurred while executing job',
        MomoErrorType.executeJob,
        { name: job.name },
        error,
      );

      expect(jobScheduler.getUnexpectedErrorCount()).toBe(1);
    });

    it('reports unexpected error with job execution', async () => {
      createIntervalJob();

      const error = new Error('Boom');
      jobExecutorMock.stubs.execute.mockRejectedValue(error);

      await jobScheduler.start();

      await sleep(1500);

      expect(errorFn).toHaveBeenCalledWith(
        'an unexpected error occurred while executing job',
        MomoErrorType.executeJob,
        { name: 'interval job' },
        error,
      );
    });

    it('reports error and restarts job after timeout due to unexpected error', async () => {
      const job = createIntervalJob({ timeout });

      jobExecutorMock.stubs.execute.mockRejectedValue(new Error('Boom'));

      await jobScheduler.start();

      await sleep(1500);

      expect(errorFn).toHaveBeenCalledWith(
        'timeout reached, restarting job now',
        MomoErrorType.executeJob,
        {
          name: job.name,
        },
      );

      await sleep(1000);

      expect(jobExecutorMock.stubs.execute).toHaveBeenCalledTimes(2);
    });

    it('reports error and restarts job after timeout due to unexpected error in one of the multiple job instances', async () => {
      const job = createIntervalJob({ timeout, concurrency: 2, maxRunning: 2 });

      jobExecutorMock.stubs.execute
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Boom'));

      await jobScheduler.start();

      await sleep(1500);

      expect(errorFn).toHaveBeenCalledWith(
        'timeout reached, restarting job now',
        MomoErrorType.executeJob,
        {
          name: job.name,
        },
      );

      await sleep(1000);

      expect(jobExecutorMock.stubs.execute).toHaveBeenCalledTimes(4);
    });
  });

  describe('concurrent interval job', () => {
    it('executes job thrice', async () => {
      createIntervalJob({ concurrency: 3, maxRunning: 3 });
      await jobScheduler.start();

      await sleep(1100);
      expect(jobExecutorMock.stubs.execute).toHaveBeenCalledTimes(3);
    });

    it('executes job when no maxRunning is set', async () => {
      const job = createIntervalJob({ maxRunning: 0, concurrency: 3 });
      await jobScheduler.start();

      await sleep(2100);
      expect(jobExecutorMock.stubs.execute).toHaveBeenCalledTimes(
        2 * job.concurrency,
      );
    });

    it('executes job only twice if it is already running', async () => {
      const _job = createIntervalJob({ concurrency: 3, maxRunning: 3 });
      schedulesRepositoryMock.stubs.countRunningExecutions.mockResolvedValue(1);

      await jobScheduler.start();

      await sleep(1100);
      expect(jobExecutorMock.stubs.execute).toHaveBeenCalledTimes(2);
    });
  });

  describe('concurrent cron job', () => {
    it('executes job thrice', async () => {
      createCronJob({ concurrency: 3, maxRunning: 3 });
      await jobScheduler.start();

      await sleep(1000);
      expect(jobExecutorMock.stubs.execute).toHaveBeenCalledTimes(3);
    });

    it('executes job when no maxRunning is set', async () => {
      const job = createCronJob({ maxRunning: 0, concurrency: 3 });
      await jobScheduler.start();

      await sleep(2000);
      expect(jobExecutorMock.stubs.execute).toHaveBeenCalledTimes(
        2 * job.concurrency,
      );
    });

    it('executes job only twice if it is already running', async () => {
      const _job = createCronJob({ concurrency: 3, maxRunning: 3 });
      schedulesRepositoryMock.stubs.countRunningExecutions.mockResolvedValue(1);

      await jobScheduler.start();

      await sleep(1000);
      expect(jobExecutorMock.stubs.execute).toHaveBeenCalledTimes(2);
    });
  });
});
