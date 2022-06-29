import { DateTime } from 'luxon';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { v4 as uuid } from 'uuid';

import { Connection } from '../../src/Connection';
import { ExecutionStatus, MomoErrorEvent, MomoErrorType, MomoJob, MongoSchedule, momoError } from '../../src';
import { ExecutionsRepository } from '../../src/repository/ExecutionsRepository';
import { JobRepository } from '../../src/repository/JobRepository';
import { initLoggingForTests } from '../utils/logging';
import { sleep } from '../utils/sleep';
import { toJob, toJobDefinition } from '../../src/job/Job';
import { waitFor } from '../utils/waitFor';
import { CronSchedule, IntervalSchedule } from '../../src/job/MomoJob';

interface TestJobHandler {
  handler: () => Promise<string>;
  duration: number;
  count: number;
  result: string;
  message: string;
  failJob: boolean;
}

describe('Momo', () => {
  let receivedError: MomoErrorEvent | undefined;

  let mongo: MongoMemoryServer;
  let jobRepository: JobRepository;
  let executionsRepository: ExecutionsRepository;
  let mongoSchedule: MongoSchedule;
  let connection: Connection;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();

    connection = await Connection.create({ url: mongo.getUri() });
    jobRepository = connection.getJobRepository();
    executionsRepository = connection.getExecutionsRepository();

    mongoSchedule = await MongoSchedule.connect({ url: mongo.getUri() });

    initLoggingForTests(mongoSchedule);

    mongoSchedule.on('error', (error) => (receivedError = error));
  });

  afterEach(async () => {
    receivedError = undefined;
    // eslint-disable-next-line jest/no-standalone-expect
    expect(mongoSchedule.getUnexpectedErrorCount()).toBe(0);
    await mongoSchedule.cancel();
    await mongoSchedule.clear();
  });

  afterAll(async () => {
    await mongoSchedule.disconnect();
    await connection.disconnect();
    await mongo.stop();
  });

  function createTestJobHandler(duration = 10): TestJobHandler {
    const jobHandler: TestJobHandler = {
      duration,
      count: 0,
      failJob: false,
      result: 'job result',
      message: 'something bad happened',
      handler: async () => {
        await sleep(duration);
        jobHandler.count++;
        if (jobHandler.failJob) {
          throw new Error(jobHandler.message);
        }
        return jobHandler.result;
      },
    };
    return jobHandler;
  }

  function createTestIntervalJob(jobHandler: TestJobHandler, schedule: IntervalSchedule): MomoJob {
    return {
      name: `interval_test_job_${uuid()}`,
      handler: jobHandler.handler,
      schedule,
    };
  }

  function createTestCronJob(jobHandler: TestJobHandler, schedule: CronSchedule): MomoJob {
    return {
      name: `cron_test_job_${uuid()}`,
      handler: jobHandler.handler,
      schedule,
    };
  }

  describe('single interval job', () => {
    let jobHandler: TestJobHandler;
    let intervalJob: MomoJob;

    beforeEach(() => {
      jobHandler = createTestJobHandler();
      intervalJob = createTestIntervalJob(jobHandler, { interval: '1 second', firstRunAfter: 0 });
    });

    it('executes a job periodically', async () => {
      await mongoSchedule.define(intervalJob);

      await mongoSchedule.start();

      await waitFor(() => expect(jobHandler.count).toBe(1), 200);
      await waitFor(() => expect(jobHandler.count).toBe(2), 1000);
    });

    it('executes job periodically after firstRunAfter', async () => {
      await mongoSchedule.define({
        ...intervalJob,
        schedule: { ...intervalJob.schedule, firstRunAfter: 1000 },
      });

      await mongoSchedule.start();

      expect(jobHandler.count).toBe(0);
      await waitFor(() => expect(jobHandler.count).toBe(1), 1200);
      await waitFor(() => expect(jobHandler.count).toBe(2), 1000);
    });

    it('executes job that was executed before', async () => {
      const jobEntity = {
        ...toJobDefinition(toJob(intervalJob)),
        executionInfo: {
          lastStarted: DateTime.now().toISO(),
          lastFinished: DateTime.now().toISO(),
          lastResult: { status: ExecutionStatus.finished, handlerResult: 'I was executed' },
        },
      };
      await jobRepository.save(jobEntity);

      await sleep(500);
      await mongoSchedule.define(intervalJob);
      await mongoSchedule.start();

      await sleep(200);
      const jobs = await jobRepository.find({ name: intervalJob.name });
      expect(jobs[0]?.executionInfo).toEqual(jobEntity.executionInfo);

      await waitFor(() => expect(jobHandler.count).toBe(1), 500);
    });

    it('saves executionInfo in mongo', async () => {
      await mongoSchedule.define(intervalJob);

      const jobs1 = await jobRepository.find({ name: intervalJob.name });
      expect(jobs1[0]!.executionInfo).toBeUndefined();

      await mongoSchedule.start();
      await waitFor(() => expect(jobHandler.count).toBe(1));

      const jobs2 = await jobRepository.find({ name: intervalJob.name });

      const executionInfo = jobs2[0]?.executionInfo;
      expect(executionInfo).toBeDefined();

      expect(DateTime.fromISO(executionInfo!.lastFinished).toMillis()).toBeGreaterThan(
        DateTime.fromISO(executionInfo!.lastStarted).toMillis()
      );
      expect(executionInfo!.lastResult).toEqual({ status: ExecutionStatus.finished, handlerResult: jobHandler.result });
    });

    it('updates and reports failing job in mongo', async () => {
      jobHandler.failJob = true;
      await mongoSchedule.define(intervalJob);

      await mongoSchedule.start();
      await waitFor(() => expect(jobHandler.count).toBe(1));

      const executionInfo = await waitFor(async () => {
        const jobs = await jobRepository.find({ name: intervalJob.name });
        const executionInfo = jobs[0]?.executionInfo;
        expect(executionInfo?.lastFinished).toBeDefined();
        return executionInfo!;
      }, 200);

      expect(executionInfo.lastResult).toEqual({ status: ExecutionStatus.failed, handlerResult: jobHandler.message });
      expect(receivedError).toEqual({
        message: 'job failed',
        type: MomoErrorType.executeJob,
        data: { name: intervalJob.name },
        error: new Error(jobHandler.message),
      });
    });

    it('updates result message when job succeeds', async () => {
      jobHandler.failJob = true;
      await mongoSchedule.define(intervalJob);
      await mongoSchedule.start();

      await waitFor(() => expect(jobHandler.count).toBe(1));
      await waitFor(async () => {
        const jobs = await jobRepository.find({ name: intervalJob.name });
        expect(jobs[0]?.executionInfo?.lastResult).toEqual({
          status: ExecutionStatus.failed,
          handlerResult: jobHandler.message,
        });
      }, 200);

      jobHandler.failJob = false;
      await waitFor(() => expect(jobHandler.count).toBe(2));
      await waitFor(async () => {
        const jobs = await jobRepository.find({ name: intervalJob.name });
        expect(jobs[0]?.executionInfo?.lastResult).toEqual({
          status: ExecutionStatus.finished,
          handlerResult: jobHandler.result,
        });
      }, 200);
    });

    it('can be stopped and restarted', async () => {
      await mongoSchedule.define(intervalJob);
      await mongoSchedule.start();

      await waitFor(() => expect(jobHandler.count).toBe(1));

      await mongoSchedule.stop();

      await sleep(1200);
      expect(jobHandler.count).toBe(1);

      await mongoSchedule.start();

      // job should be executed immediately, because last run is further in the past than the interval
      await waitFor(() => expect(jobHandler.count).toBe(2), 200);
    });

    it('updates already started job', async () => {
      await mongoSchedule.define(intervalJob);
      await mongoSchedule.start();
      await waitFor(() => expect(jobHandler.count).toBe(1));

      await mongoSchedule.define({
        ...intervalJob,
        schedule: { ...intervalJob.schedule, interval: '2 seconds' },
      });
      await mongoSchedule.start(); // pick up the new interval

      await sleep(1200);
      expect(jobHandler.count).toBe(1);
      await sleep(1200);
      expect(jobHandler.count).toBe(2);
    });

    it('does not execute a job that was removed from mongo', async () => {
      await mongoSchedule.define(intervalJob);
      await mongoSchedule.start();

      await waitFor(() => expect(jobHandler.count).toBe(1));
      await jobRepository.delete();
      await sleep(2000);

      expect(jobHandler.count).toBe(1);
    });

    it('updates maxRunning and concurrency from mongo', async () => {
      await mongoSchedule.define(intervalJob);

      const updatedConcurrency = 5;
      const updatedMaxRunning = 10;
      await jobRepository.updateOne(
        { name: intervalJob.name },
        { $set: { concurrency: updatedConcurrency, maxRunning: updatedMaxRunning } }
      );

      await waitFor(async () => {
        const updatedJobs = await mongoSchedule.list();
        expect(updatedJobs[0]?.concurrency).toEqual(updatedConcurrency);
        expect(updatedJobs[0]?.maxRunning).toEqual(updatedMaxRunning);
      });

      await mongoSchedule.start();

      await waitFor(() => expect(jobHandler.count).toBe(updatedConcurrency));
    });

    it('does not update interval of started job from mongo', async () => {
      await mongoSchedule.define(intervalJob);

      await mongoSchedule.start();

      const updatedSchedule = { interval: '2 seconds', firstRunAfter: 0 };
      await jobRepository.updateOne({ name: intervalJob.name }, { $set: { schedule: updatedSchedule } });

      await waitFor(() => expect(jobHandler.count).toBe(1));

      const updatedJobs = await mongoSchedule.list();
      const { schedule, schedulerStatus } = updatedJobs[0]!;
      expect(schedule).toEqual(updatedSchedule);
      expect(schedulerStatus?.schedule).toEqual(intervalJob.schedule);
      expect(schedulerStatus?.running).toBeGreaterThanOrEqual(0);
    });
  });

  describe('single cron job', () => {
    let jobHandler: TestJobHandler;
    let cronJob: MomoJob;

    beforeEach(() => {
      jobHandler = createTestJobHandler();
      cronJob = createTestCronJob(jobHandler, { cronSchedule: '*/1 * * * * *' });
    });

    it('executes a job periodically', async () => {
      await mongoSchedule.define(cronJob);

      await mongoSchedule.start();

      await waitFor(() => expect(jobHandler.count).toBe(1), 1200);
      await waitFor(() => expect(jobHandler.count).toBe(2), 1000);
    });

    it('saves executionInfo in mongo', async () => {
      await mongoSchedule.define(cronJob);

      const jobs1 = await jobRepository.find({ name: cronJob.name });
      expect(jobs1[0]!.executionInfo).toBeUndefined();

      await mongoSchedule.start();
      await waitFor(() => expect(jobHandler.count).toBe(1));

      const jobs2 = await jobRepository.find({ name: cronJob.name });

      const executionInfo = jobs2[0]?.executionInfo;
      expect(executionInfo).toBeDefined();

      expect(DateTime.fromISO(executionInfo!.lastFinished).toMillis()).toBeGreaterThan(
        DateTime.fromISO(executionInfo!.lastStarted).toMillis()
      );
      expect(executionInfo!.lastResult).toEqual({ status: ExecutionStatus.finished, handlerResult: jobHandler.result });
    });

    it('updates and reports failing job in mongo', async () => {
      jobHandler.failJob = true;
      await mongoSchedule.define(cronJob);

      await mongoSchedule.start();
      await waitFor(() => expect(jobHandler.count).toBe(1));

      const executionInfo = await waitFor(async () => {
        const jobs = await jobRepository.find({ name: cronJob.name });
        const executionInfo = jobs[0]?.executionInfo;
        expect(executionInfo?.lastFinished).toBeDefined();
        return executionInfo!;
      }, 200);

      expect(executionInfo.lastResult).toEqual({ status: ExecutionStatus.failed, handlerResult: jobHandler.message });
      expect(receivedError).toEqual({
        message: 'job failed',
        type: MomoErrorType.executeJob,
        data: { name: cronJob.name },
        error: new Error(jobHandler.message),
      });
    });

    it('updates result message when job succeeds', async () => {
      jobHandler.failJob = true;
      await mongoSchedule.define(cronJob);
      await mongoSchedule.start();

      await waitFor(() => expect(jobHandler.count).toBe(1));
      await waitFor(async () => {
        const jobs = await jobRepository.find({ name: cronJob.name });
        expect(jobs[0]?.executionInfo?.lastResult).toEqual({
          status: ExecutionStatus.failed,
          handlerResult: jobHandler.message,
        });
      }, 200);

      jobHandler.failJob = false;
      await waitFor(() => expect(jobHandler.count).toBe(2));
      await waitFor(async () => {
        const jobs = await jobRepository.find({ name: cronJob.name });
        expect(jobs[0]?.executionInfo?.lastResult).toEqual({
          status: ExecutionStatus.finished,
          handlerResult: jobHandler.result,
        });
      }, 200);
    });

    it('can be stopped', async () => {
      await mongoSchedule.define(cronJob);
      await mongoSchedule.start();

      await waitFor(() => expect(jobHandler.count).toBe(2), 5000);

      await mongoSchedule.stop();

      await sleep(1200);
      expect(jobHandler.count).toBe(2);
    });

    it('does not execute a job that was removed from mongo', async () => {
      await mongoSchedule.define(cronJob);
      await mongoSchedule.start();

      await waitFor(() => expect(jobHandler.count).toBe(1));
      await jobRepository.delete();
      await sleep(2000);

      expect(jobHandler.count).toBe(1);
    });

    it('updates maxRunning and concurrency from mongo', async () => {
      await mongoSchedule.define(cronJob);

      const updatedConcurrency = 5;
      const updatedMaxRunning = 10;
      await jobRepository.updateOne(
        { name: cronJob.name },
        { $set: { concurrency: updatedConcurrency, maxRunning: updatedMaxRunning } }
      );

      await waitFor(async () => {
        const updatedJobs = await mongoSchedule.list();
        expect(updatedJobs[0]?.concurrency).toEqual(updatedConcurrency);
        expect(updatedJobs[0]?.maxRunning).toEqual(updatedMaxRunning);
      });

      await mongoSchedule.start();

      await waitFor(() => expect(jobHandler.count).toBe(updatedConcurrency));
    });
  });

  describe('several jobs', () => {
    let jobHandler1: TestJobHandler;
    let jobHandler2: TestJobHandler;
    let job1: MomoJob;
    let job2: MomoJob;

    beforeEach(() => {
      jobHandler1 = createTestJobHandler();
      jobHandler2 = createTestJobHandler();
      job1 = createTestIntervalJob(jobHandler1, { interval: '1 second', firstRunAfter: 0 });
      job2 = createTestIntervalJob(jobHandler2, { interval: '1 second', firstRunAfter: 0 });
    });

    it('executes, updates and stops with two jobs', async () => {
      await mongoSchedule.define(job1);
      await mongoSchedule.define(job2);

      await mongoSchedule.start();

      await waitFor(() => {
        expect(jobHandler1.count).toBe(1);
        expect(jobHandler2.count).toBe(1);
      });

      // update
      await mongoSchedule.define({ ...job1, schedule: { interval: '2 seconds', firstRunAfter: 0 } });
      await mongoSchedule.start();

      await sleep(4000);
      expect(jobHandler1.count).toBe(3);
      expect(jobHandler2.count).toBe(5);

      await mongoSchedule.stop();

      await sleep(2000);
      expect(jobHandler1.count).toBe(3);
      expect(jobHandler2.count).toBe(5);
    });

    it('starts jobs defined after first start', async () => {
      await mongoSchedule.define(job1);

      await mongoSchedule.start();

      await sleep(200);
      expect(jobHandler1.count).toBe(1);
      await mongoSchedule.define(job2);

      await mongoSchedule.start();

      await sleep(2000);
      expect(jobHandler1.count).toBe(3);
      expect(jobHandler2.count).toBe(2);
    });

    it('stops one of two jobs', async () => {
      await mongoSchedule.define(job1);
      await mongoSchedule.define(job2);

      await mongoSchedule.start();

      await waitFor(() => {
        expect(jobHandler1.count).toBe(1);
        expect(jobHandler2.count).toBe(1);
      });

      await mongoSchedule.stopJob(job1.name);

      await sleep(1200);
      expect(jobHandler1.count).toBe(1);
      expect(jobHandler2.count).toBe(2);
    });

    it('removes one of two jobs', async () => {
      await mongoSchedule.define(job1);
      await mongoSchedule.define(job2);

      await mongoSchedule.start();

      await waitFor(() => {
        expect(jobHandler1.count).toBe(1);
        expect(jobHandler2.count).toBe(1);
      });

      await mongoSchedule.removeJob(job1.name);

      await sleep(1200);
      expect(jobHandler1.count).toBe(1);
      expect(jobHandler2.count).toBe(2);

      const jobs = await jobRepository.find();
      expect(jobs).toHaveLength(1);
      expect(jobs[0]?.name).toEqual(job2.name);
    });

    it('does not fail when trying to remove a non existent job', async () => {
      await expect(mongoSchedule.removeJob(job1.name)).resolves.not.toThrow();
    });

    it('cancels one of two jobs', async () => {
      await mongoSchedule.define(job1);
      await mongoSchedule.define(job2);

      await mongoSchedule.start();

      await waitFor(() => {
        expect(jobHandler1.count).toBe(1);
        expect(jobHandler2.count).toBe(1);
      });

      await mongoSchedule.cancelJob(job1.name);

      await sleep(1200);
      expect(jobHandler1.count).toBe(1);
      expect(jobHandler2.count).toBe(2);
    });

    it('starts one of two jobs', async () => {
      await mongoSchedule.define(job1);
      await mongoSchedule.define(job2);

      await mongoSchedule.startJob(job1.name);

      await sleep(200);
      expect(jobHandler1.count).toBe(1);
      expect(jobHandler2.count).toBe(0);
    });

    it('stops all jobs', async () => {
      await mongoSchedule.define(job1);
      await mongoSchedule.define(job2);
      await mongoSchedule.start();

      await waitFor(() => {
        expect(jobHandler1.count).toBe(1);
        expect(jobHandler2.count).toBe(1);
      });

      await mongoSchedule.stop();

      await sleep(1200);
      expect(jobHandler1.count).toBe(1);
      expect(jobHandler2.count).toBe(1);
    });

    it('cancels all jobs', async () => {
      await mongoSchedule.define(job1);
      await mongoSchedule.define(job2);
      await mongoSchedule.start();

      await waitFor(() => {
        expect(jobHandler1.count).toBe(1);
        expect(jobHandler2.count).toBe(1);
      });

      await mongoSchedule.cancel();

      await sleep(1200);
      expect(jobHandler1.count).toBe(1);
      expect(jobHandler2.count).toBe(1);
    });

    it('removes all jobs', async () => {
      await mongoSchedule.define(job1);
      await mongoSchedule.define(job2);

      await mongoSchedule.start();

      await waitFor(() => {
        expect(jobHandler1.count).toBe(1);
        expect(jobHandler2.count).toBe(1);
      });

      await mongoSchedule.remove();

      await sleep(1200);
      expect(jobHandler1.count).toBe(1);
      expect(jobHandler2.count).toBe(1);

      const jobs = await jobRepository.find();
      expect(jobs).toHaveLength(0);
    });
  });

  describe('long running interval jobs', () => {
    jest.setTimeout(10_000);

    let jobHandler: TestJobHandler;
    let job: MomoJob;

    beforeEach(() => {
      jobHandler = createTestJobHandler(3200);
      job = createTestIntervalJob(jobHandler, { interval: '1 second', firstRunAfter: 0 });
    });

    it('executes a long running job', async () => {
      await mongoSchedule.define(job);

      await mongoSchedule.start();
      await waitFor(() => expect(jobHandler.count).toBe(1), jobHandler.duration + 1000);

      const { executionInfo } = await waitFor(async () => {
        const savedJobs = await jobRepository.find({ name: job.name });
        expect(savedJobs[0]?.executionInfo?.lastFinished).toBeDefined();
        return savedJobs[0]!;
      });

      expect(executionInfo).toBeDefined();
      if (!executionInfo) throw new Error('should be defined');
      const duration =
        DateTime.fromISO(executionInfo.lastFinished).toMillis() -
        DateTime.fromISO(executionInfo.lastStarted).toMillis();
      expect(duration).toBeGreaterThan(3000);
    });

    it('does not start twice a long running job that should not run in parallel', async () => {
      await mongoSchedule.define({ ...job, maxRunning: 1 });

      await mongoSchedule.start();
      await waitFor(() => expect(jobHandler.count).toBe(1), jobHandler.duration + 1000);

      await mongoSchedule.stop();

      await sleep(jobHandler.duration);
      expect(jobHandler.count).toBe(1);
    });

    it('respects maxRunning', async () => {
      await mongoSchedule.define({ ...job, maxRunning: 2 });

      await mongoSchedule.start();

      await sleep(2200);
      const runningAfter2Sec = await executionsRepository.countRunningExecutions(job.name);
      expect(runningAfter2Sec).toBe(2);

      await sleep(1000);
      const runningAfter3Sec = await executionsRepository.countRunningExecutions(job.name);
      expect(runningAfter3Sec).toBe(2);

      await mongoSchedule.stop();

      const running = await executionsRepository.countRunningExecutions(job.name);
      expect(running).toBe(0);
    });

    it('start job twice if maxRunning is set to 0 (no max, default)', async () => {
      await mongoSchedule.define(job);

      await mongoSchedule.start();

      await waitFor(async () => {
        const running = await executionsRepository.countRunningExecutions(job.name);
        expect(running).toBe(2);
      });
    });

    it('updates running in mongo', async () => {
      await mongoSchedule.define({ ...job, maxRunning: 1 });

      await mongoSchedule.start();

      await waitFor(async () => {
        const running = await executionsRepository.countRunningExecutions(job.name);
        expect(running).toBe(1);
      });

      await waitFor(async () => {
        const running = await executionsRepository.countRunningExecutions(job.name);
        expect(running).toBe(0);
      }, jobHandler.duration + 1000);
    });

    it('executes a job that is removed from mongo during execution', async () => {
      await mongoSchedule.define(job);

      await mongoSchedule.start();

      await waitFor(async () => {
        const running = await executionsRepository.countRunningExecutions(job.name);
        expect(running).toBe(1);
      }, 1100);

      await jobRepository.delete();

      await waitFor(async () => {
        expect(await jobRepository.find({ name: job.name })).toHaveLength(0);
      }, jobHandler.duration);
    });

    it('reports error when job is removed from mongo between scheduling and executing it', async () => {
      await mongoSchedule.define(job);

      await mongoSchedule.start();

      await jobRepository.delete();

      await waitFor(() => {
        expect(receivedError).toEqual({
          message: 'job not found, skip execution',
          type: MomoErrorType.executeJob,
          data: { name: job.name },
          error: momoError.jobNotFound,
        });
      });
    });

    it('stopped job does not decrease execution count', async () => {
      await mongoSchedule.define(job);

      await mongoSchedule.start();

      await waitFor(async () => {
        const running = await executionsRepository.countRunningExecutions(job.name);
        expect(running).toBe(1);
      }, 1200);

      await mongoSchedule.stop();

      const running = await executionsRepository.countRunningExecutions(job.name);
      expect(running).toBe(0);

      await sleep(jobHandler.duration + 1000);
      expect(jobHandler.count).toBe(1);

      const running2 = await executionsRepository.countRunningExecutions(job.name);
      expect(running2).toBe(0);
    });
  });

  describe('long running cron jobs', () => {
    jest.setTimeout(10_000);

    let jobHandler: TestJobHandler;
    let job: MomoJob;

    beforeEach(() => {
      jobHandler = createTestJobHandler(3200);
      job = createTestCronJob(jobHandler, { cronSchedule: '*/1 * * * * *' });
    });

    it('executes a long running job', async () => {
      await mongoSchedule.define(job);

      await mongoSchedule.start();
      await waitFor(() => expect(jobHandler.count).toBe(1), jobHandler.duration + 1000);

      const { executionInfo } = await waitFor(async () => {
        const savedJobs = await jobRepository.find({ name: job.name });
        expect(savedJobs[0]?.executionInfo?.lastFinished).toBeDefined();
        return savedJobs[0]!;
      });

      expect(executionInfo).toBeDefined();
      if (!executionInfo) throw new Error('should be defined');
      const duration =
        DateTime.fromISO(executionInfo.lastFinished).toMillis() -
        DateTime.fromISO(executionInfo.lastStarted).toMillis();
      expect(duration).toBeGreaterThan(3000);
    });

    it('does not start twice a long running job that should not run in parallel', async () => {
      await mongoSchedule.define({ ...job, maxRunning: 1 });

      await mongoSchedule.start();
      await waitFor(() => expect(jobHandler.count).toBe(1), jobHandler.duration + 1000);

      await mongoSchedule.stop();

      await sleep(jobHandler.duration);
      expect(jobHandler.count).toBe(1);
    });

    it('respects maxRunning', async () => {
      await mongoSchedule.define({ ...job, maxRunning: 2 });

      await mongoSchedule.start();

      await sleep(2200);
      const runningAfter2Sec = await executionsRepository.countRunningExecutions(job.name);
      expect(runningAfter2Sec).toBe(2);

      await sleep(1000);
      const runningAfter3Sec = await executionsRepository.countRunningExecutions(job.name);
      expect(runningAfter3Sec).toBe(2);

      await mongoSchedule.stop();

      const running = await executionsRepository.countRunningExecutions(job.name);
      expect(running).toBe(0);
    });

    it('start job twice if maxRunning is set to 0 (no max, default)', async () => {
      await mongoSchedule.define(job);

      await mongoSchedule.start();

      await waitFor(async () => {
        const running = await executionsRepository.countRunningExecutions(job.name);
        expect(running).toBe(2);
      });
    });

    it('updates running in mongo', async () => {
      await mongoSchedule.define({ ...job, maxRunning: 1 });

      await mongoSchedule.start();

      await waitFor(async () => {
        const running = await executionsRepository.countRunningExecutions(job.name);
        expect(running).toBe(1);
      });

      await waitFor(async () => {
        const running = await executionsRepository.countRunningExecutions(job.name);
        expect(running).toBe(0);
      }, jobHandler.duration + 1000);
    });

    it('executes a job that is removed from mongo during execution', async () => {
      await mongoSchedule.define(job);

      await mongoSchedule.start();

      await waitFor(async () => {
        const running = await executionsRepository.countRunningExecutions(job.name);
        expect(running).toBe(1);
      }, 1010);

      await jobRepository.delete();

      await waitFor(async () => {
        expect(await jobRepository.find({ name: job.name })).toHaveLength(0);
      }, jobHandler.duration);
    });

    it('reports error when job is removed from mongo between scheduling and executing it', async () => {
      await mongoSchedule.define(job);

      await mongoSchedule.start();

      await jobRepository.delete();

      await waitFor(() => {
        expect(receivedError).toEqual({
          message: 'job not found, skip execution',
          type: MomoErrorType.executeJob,
          data: { name: job.name },
          error: momoError.jobNotFound,
        });
      });
    });

    it('stopped job does not decrease execution count', async () => {
      await mongoSchedule.define(job);

      await mongoSchedule.start();

      await waitFor(async () => {
        const running = await executionsRepository.countRunningExecutions(job.name);
        expect(running).toBe(1);
      }, 1200);

      await mongoSchedule.stop();

      const running = await executionsRepository.countRunningExecutions(job.name);
      expect(running).toBe(0);

      await sleep(jobHandler.duration + 1000);
      expect(jobHandler.count).toBe(1);

      const running2 = await executionsRepository.countRunningExecutions(job.name);
      expect(running2).toBe(0);
    });
  });

  describe('concurrent job', () => {
    let jobHandler: TestJobHandler;
    let job: MomoJob;

    beforeEach(() => {
      jobHandler = createTestJobHandler(3000);
      job = { ...createTestIntervalJob(jobHandler, { interval: '1 second', firstRunAfter: 0 }), concurrency: 3 };
    });

    it('executes concurrent job', async () => {
      await mongoSchedule.define(job);

      await mongoSchedule.start();

      await waitFor(async () => {
        const running = await executionsRepository.countRunningExecutions(job.name);
        expect(running).toBe(job.concurrency);
      }, 1200);
    });

    it('respects maxRunning when executing concurrently when another schedule is already executing job', async () => {
      await mongoSchedule.define({ ...job, maxRunning: 3 });

      const otherScheduleId = '123';
      await executionsRepository.addSchedule(otherScheduleId);
      await executionsRepository.addExecution(otherScheduleId, job.name, 0);

      await mongoSchedule.start();

      await waitFor(() => expect(jobHandler.count).toBe(2), jobHandler.duration + 1200);
    });
  });
});
