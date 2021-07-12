import { DateTime } from 'luxon';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { getConnection } from 'typeorm';
import { v4 as uuid } from 'uuid';
import { clear, ExecutionStatus, MomoError, MomoErrorType, MomoJob, MongoSchedule } from '../../src';
import { JobEntity } from '../../src/repository/JobEntity';
import { JobRepository } from '../../src/repository/JobRepository';
import { sleep } from '../utils/sleep';
import { waitFor } from '../utils/waitFor';
import { connectionName } from '../../src/connect';
import { withDefaults } from '../../src/job/withDefaults';
import { initLoggingForTests } from '../utils/logging';
import { MomoErrorEvent } from '../../src';

interface TestJobHandler {
  handler: () => Promise<string>;
  duration: number;
  count: number;
  result: string;
  message: string;
  failJob: boolean;
}

describe('schedule', () => {
  let receivedError: MomoErrorEvent | undefined;

  let mongo: MongoMemoryServer;
  let jobRepository: JobRepository;
  let mongoSchedule: MongoSchedule;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    mongoSchedule = await MongoSchedule.connect({ url: await mongo.getUri() });
    jobRepository = getConnection(connectionName).getCustomRepository(JobRepository);

    initLoggingForTests(mongoSchedule);

    mongoSchedule.on('error', (error) => (receivedError = error));
  });

  beforeEach(async () => {
    mongoSchedule.cancel();
    await clear();
  });

  afterEach(() => {
    receivedError = undefined;
    // eslint-disable-next-line jest/no-standalone-expect
    expect(mongoSchedule.getUnexpectedErrorCount()).toBe(0);
  });

  afterAll(async () => {
    await mongoSchedule.disconnect();
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

  function createTestJob(jobHandler: TestJobHandler): MomoJob {
    return {
      name: `test_job_${uuid()}`,
      interval: '1 second',
      handler: jobHandler.handler,
    };
  }

  describe('single job', () => {
    let jobHandler: TestJobHandler;
    let job: MomoJob;

    beforeEach(() => {
      jobHandler = createTestJobHandler();
      job = createTestJob(jobHandler);
    });

    it('executes job periodically', async () => {
      await mongoSchedule.define(job);

      await mongoSchedule.start();

      expect(jobHandler.count).toBe(0);
      await waitFor(() => expect(jobHandler.count).toBe(1), 1100);
      await waitFor(() => expect(jobHandler.count).toBe(2), 1000);
    });

    it('executes an immediate job periodically', async () => {
      await mongoSchedule.define({ ...job, immediate: true });

      await mongoSchedule.start();

      await waitFor(() => expect(jobHandler.count).toBe(1), 100);
      await waitFor(() => expect(jobHandler.count).toBe(2), 1000);
    });

    it('executes job that was executed before', async () => {
      const jobEntity = JobEntity.from(withDefaults(job));
      jobEntity.executionInfo = {
        lastStarted: DateTime.now().toISO(),
        lastFinished: DateTime.now().toISO(),
        lastResult: { status: ExecutionStatus.finished, handlerResult: 'I was executed' },
      };
      await jobRepository.save(jobEntity);

      await sleep(500);
      await mongoSchedule.define(job);

      const [{ executionInfo }] = await jobRepository.find({ name: job.name });
      expect(executionInfo).toEqual(jobEntity.executionInfo);

      await mongoSchedule.start();

      await waitFor(() => expect(jobHandler.count).toBe(1), 600);
    });

    it('saves executionInfo in mongo', async () => {
      await mongoSchedule.define(job);

      const [{ executionInfo: info1 }] = await jobRepository.find({ name: job.name });
      expect(info1).toBeUndefined();

      await mongoSchedule.start();
      await waitFor(() => expect(jobHandler.count).toBe(1));

      const [{ executionInfo: info2 }] = await jobRepository.find({ name: job.name });
      expect(info2).toBeDefined();
      if (!info2) throw new Error('should be defined');
      expect(DateTime.fromISO(info2.lastFinished).toMillis()).toBeGreaterThan(
        DateTime.fromISO(info2.lastStarted).toMillis()
      );
      expect(info2?.lastResult).toEqual({ status: ExecutionStatus.finished, handlerResult: jobHandler.result });
    });

    it('updates and reports failing job in mongo', async () => {
      jobHandler.failJob = true;
      await mongoSchedule.define(job);

      await mongoSchedule.start();
      await waitFor(() => expect(jobHandler.count).toBe(1));

      const executionInfo = await waitFor(async () => {
        const [{ executionInfo }] = await jobRepository.find({ name: job.name });
        expect(executionInfo?.lastFinished).toBeDefined();
        return executionInfo;
      }, 100);
      expect(executionInfo?.lastResult).toEqual({ status: ExecutionStatus.failed, handlerResult: jobHandler.message });
      expect(receivedError).toEqual({
        message: 'job failed',
        type: MomoErrorType.executeJob,
        data: { name: job.name },
        error: new Error(jobHandler.message),
      });
    });

    it('updates result message when job succeeds', async () => {
      jobHandler.failJob = true;
      await mongoSchedule.define(job);
      await mongoSchedule.start();

      await waitFor(() => expect(jobHandler.count).toBe(1));
      await waitFor(async () => {
        const [{ executionInfo: info1 }] = await jobRepository.find({ name: job.name });
        expect(info1?.lastResult).toEqual({ status: ExecutionStatus.failed, handlerResult: jobHandler.message });
      }, 100);

      jobHandler.failJob = false;
      await waitFor(() => expect(jobHandler.count).toBe(2));
      await waitFor(async () => {
        const [{ executionInfo: info2 }] = await jobRepository.find({ name: job.name });
        expect(info2?.lastResult).toEqual({ status: ExecutionStatus.finished, handlerResult: jobHandler.result });
      }, 100);
    });

    it('can be stopped and restarted', async () => {
      await mongoSchedule.define(job);
      await mongoSchedule.start();

      await waitFor(() => expect(jobHandler.count).toBe(1));

      mongoSchedule.stop();

      await sleep(1100);
      expect(jobHandler.count).toBe(1);

      await mongoSchedule.start();

      // job should be executed immediately, because last run is further in the past than the interval
      await waitFor(() => expect(jobHandler.count).toBe(2), 100);
    });

    it('updates already started job', async () => {
      await mongoSchedule.define(job);
      await mongoSchedule.start();
      await waitFor(() => expect(jobHandler.count).toBe(1));

      await mongoSchedule.define({ ...job, interval: '2 seconds' });
      await mongoSchedule.start(); // pick up the new interval

      await sleep(1100);
      expect(jobHandler.count).toBe(1);
      await sleep(1100);
      expect(jobHandler.count).toBe(2);
    });

    it('does not execute a job that was removed from mongo', async () => {
      await mongoSchedule.define(job);

      await mongoSchedule.start();
      await jobRepository.clear();

      await sleep(1500);
      expect(jobHandler.count).toBe(0);
    });

    it('updates maxRunning and concurrency from mongo', async () => {
      await mongoSchedule.define(job);

      await mongoSchedule.start();

      const updatedConcurrency = 5;
      const updatedMaxRunning = 10;
      await jobRepository.update(
        { name: job.name },
        { concurrency: updatedConcurrency, maxRunning: updatedMaxRunning }
      );

      await waitFor(async () => {
        const [updatedJob] = await mongoSchedule.list();
        expect(updatedJob.concurrency).toEqual(updatedConcurrency);
        expect(updatedJob.maxRunning).toEqual(updatedMaxRunning);
      });

      await sleep(1100);
      expect(jobHandler.count).toBe(updatedConcurrency);
    });

    it('does not update interval of started job from mongo', async () => {
      await mongoSchedule.define(job);

      await mongoSchedule.start();

      const updatedInterval = '2 seconds';
      await jobRepository.update({ name: job.name }, { interval: updatedInterval });

      await waitFor(() => expect(jobHandler.count).toBe(1));
      const [updatedJob] = await mongoSchedule.list();
      expect(updatedJob).toEqual({
        name: job.name,
        concurrency: 1,
        maxRunning: 0,
        interval: updatedInterval,
        schedulerStatus: { started: true, interval: job.interval },
      });
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
      job1 = createTestJob(jobHandler1);
      job2 = createTestJob(jobHandler2);
    });

    it('executes, updates and stops with two jobs', async () => {
      await mongoSchedule.define(job1);
      await mongoSchedule.define(job2);

      await mongoSchedule.start();

      await waitFor(() => {
        expect(jobHandler1.count).toBe(1);
        expect(jobHandler2.count).toBe(1);
      });

      await mongoSchedule.define({ ...job1, interval: '2 seconds' });
      await mongoSchedule.start();
      await sleep(2100);
      expect(jobHandler1.count).toBe(2);
      expect(jobHandler2.count).toBe(3);

      mongoSchedule.stop();

      await sleep(2500);
      expect(jobHandler1.count).toBe(2);
      expect(jobHandler2.count).toBe(3);
    });

    it('starts jobs defined after first start', async () => {
      await mongoSchedule.define(job1);

      await mongoSchedule.start();

      await sleep(1100);
      expect(jobHandler1.count).toBe(1);
      await mongoSchedule.define(job2);

      await mongoSchedule.start();

      await sleep(1100);
      expect(jobHandler1.count).toBe(2);
      expect(jobHandler2.count).toBe(1);
    });

    it('stops one of two jobs', async () => {
      await mongoSchedule.define(job1);
      await mongoSchedule.define(job2);

      await mongoSchedule.start();

      await waitFor(() => {
        expect(jobHandler1.count).toBe(1);
        expect(jobHandler2.count).toBe(1);
      });

      mongoSchedule.stopJob(job1.name);

      await sleep(1500);
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

      await sleep(1500);
      expect(jobHandler1.count).toBe(1);
      expect(jobHandler2.count).toBe(2);

      const jobs = await jobRepository.find();
      expect(jobs).toHaveLength(1);
      expect(jobs[0].name).toEqual(job2.name);
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

      mongoSchedule.cancelJob(job1.name);

      await sleep(1500);
      expect(jobHandler1.count).toBe(1);
      expect(jobHandler2.count).toBe(2);
    });

    it('starts one of two jobs', async () => {
      await mongoSchedule.define(job1);
      await mongoSchedule.define(job2);

      await mongoSchedule.startJob(job1.name);

      await sleep(1500);
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

      mongoSchedule.stop();

      await sleep(1500);
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

      mongoSchedule.cancel();

      await sleep(1500);
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

      await sleep(1500);
      expect(jobHandler1.count).toBe(1);
      expect(jobHandler2.count).toBe(1);

      const jobs = await jobRepository.find();
      expect(jobs).toHaveLength(0);
    });
  });

  describe('long running jobs', () => {
    jest.setTimeout(10_000);

    let jobHandler: TestJobHandler;
    let job: MomoJob;

    beforeEach(() => {
      jobHandler = createTestJobHandler(3100);
      job = createTestJob(jobHandler);
    });

    it('executes a long running job', async () => {
      await mongoSchedule.define(job);

      await mongoSchedule.start();
      await waitFor(() => expect(jobHandler.count).toBe(1), jobHandler.duration + 1000);

      const { executionInfo } = await waitFor(async () => {
        const savedJob = (await jobRepository.find({ name: job.name }))[0];
        expect(savedJob.executionInfo?.lastFinished).toBeDefined();
        return savedJob;
      });

      expect(executionInfo).toBeDefined();
      if (!executionInfo) throw new Error('should be defined');
      const duration =
        DateTime.fromISO(executionInfo.lastFinished).toMillis() -
        DateTime.fromISO(executionInfo.lastStarted).toMillis();
      expect(duration).toBeGreaterThanOrEqual(jobHandler.duration);
    });

    it('does not start twice a long running job that should not run in parallel', async () => {
      await mongoSchedule.define({ ...job, maxRunning: 1 });

      await mongoSchedule.start();
      await waitFor(() => expect(jobHandler.count).toBe(1), jobHandler.duration + 1000);

      mongoSchedule.stop();

      await sleep(jobHandler.duration);
      expect(jobHandler.count).toBe(1);
    });

    it('respects maxRunning', async () => {
      await mongoSchedule.define({ ...job, maxRunning: 2 });

      await mongoSchedule.start();

      await sleep(2100);
      const [{ running: runningAfter2Sec }] = await jobRepository.find({ name: job.name });
      expect(runningAfter2Sec).toBe(2);

      await sleep(1000);
      const [{ running: runningAfter3Sec }] = await jobRepository.find({ name: job.name });
      expect(runningAfter3Sec).toBe(2);

      mongoSchedule.stop();

      await waitFor(() => {
        expect(jobHandler.count).toBe(2);
      }, jobHandler.duration + 2000);

      await waitFor(async () => {
        const [{ running }] = await jobRepository.find({ name: job.name });
        expect(running).toBe(0);
      });
    });

    it('start job twice if maxRunning is set to 0 (no max, default)', async () => {
      await mongoSchedule.define(job);

      await mongoSchedule.start();

      await waitFor(async () => {
        const [{ running }] = await jobRepository.find({ name: job.name });
        expect(running).toBe(2);
      });
    });

    it('updates running in mongo', async () => {
      await mongoSchedule.define({ ...job, maxRunning: 1 });

      await mongoSchedule.start();

      await waitFor(async () => {
        const [{ running }] = await jobRepository.find({ name: job.name });
        expect(running).toBe(1);
      });

      await waitFor(async () => {
        const [{ running }] = await jobRepository.find({ name: job.name });
        expect(running).toBe(0);
      }, jobHandler.duration);
    });

    it('executes a job that is removed from mongo during execution', async () => {
      await mongoSchedule.define(job);

      await mongoSchedule.start();

      await waitFor(async () => {
        const [{ running }] = await jobRepository.find({ name: job.name });
        expect(running).toBe(1);
      }, 1100);

      await jobRepository.clear();

      await waitFor(async () => {
        expect(await jobRepository.find({ name: job.name })).toHaveLength(0);
      }, jobHandler.duration);
    });

    it('reports error when job is removed from mongo between scheduling and executing it', async () => {
      await mongoSchedule.define(job);

      await mongoSchedule.start();

      await jobRepository.clear();

      await waitFor(() => {
        expect(receivedError).toEqual({
          message: 'job not found, skip execution',
          type: MomoErrorType.executeJob,
          data: { name: job.name },
          error: MomoError.jobNotFound,
        });
      });
    });
  });

  describe('concurrent job', () => {
    let jobHandler: TestJobHandler;
    let job: MomoJob;

    beforeEach(() => {
      jobHandler = createTestJobHandler(3000);
      job = { ...createTestJob(jobHandler), concurrency: 3 };
    });

    it('executes concurrent job', async () => {
      await mongoSchedule.define(job);

      await mongoSchedule.start();

      await waitFor(async () => {
        const [{ running }] = await jobRepository.find({ name: job.name });
        expect(running).toBe(job.concurrency);
      }, 1100);
    });

    it('respects maxRunning when executing concurrently', async () => {
      await mongoSchedule.define({ ...job, maxRunning: 3 });

      await jobRepository.update({ name: job.name }, { running: 1 });

      await mongoSchedule.start();

      await waitFor(() => {
        expect(jobHandler.count).toBe(2);
      }, jobHandler.duration + 1100);
    });
  });
});
