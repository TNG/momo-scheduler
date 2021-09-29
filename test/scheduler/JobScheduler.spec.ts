import { anything, deepEqual, instance, mock, verify, when } from 'ts-mockito';

import { ExecutionsRepository } from '../../src/repository/ExecutionsRepository';
import { Job, toJobDefinition } from '../../src/job/Job';
import { JobExecutor } from '../../src/executor/JobExecutor';
import { JobRepository } from '../../src/repository/JobRepository';
import { JobScheduler } from '../../src/scheduler/JobScheduler';
import { MomoErrorType, momoError } from '../../src';
import { loggerForTests } from '../utils/logging';
import { sleep } from '../utils/sleep';

describe('JobScheduler', () => {
  const defaultJob: Job = {
    name: 'test',
    interval: '1 second',
    concurrency: 1,
    maxRunning: 0,
    handler: jest.fn(),
  };
  const errorFn = jest.fn();
  const scheduleId = '123';

  let executionsRepository: ExecutionsRepository;
  let jobRepository: JobRepository;
  let jobExecutor: JobExecutor;
  let jobScheduler: JobScheduler;

  beforeEach(() => {
    executionsRepository = mock(ExecutionsRepository);
    jobRepository = mock(JobRepository);
    jobExecutor = mock(JobExecutor);
    when(jobExecutor.execute(anything())).thenResolve();
  });

  afterEach(async () => {
    await jobScheduler.stop();
  });

  function createJob(partialJob: Partial<Job> = {}): Job {
    const job = { ...defaultJob, ...partialJob };
    jobScheduler = new JobScheduler(
      job.name,
      instance(jobExecutor),
      scheduleId,
      instance(executionsRepository),
      instance(jobRepository),
      loggerForTests(errorFn)
    );
    when(jobRepository.findOne(deepEqual({ name: job.name }))).thenResolve(job);
    when(executionsRepository.countRunningExecutions(job.name)).thenResolve(0);
    return job;
  }

  describe('single job', () => {
    it('executes a job', async () => {
      createJob();
      await jobScheduler.start();

      await sleep(1100);
      verify(await jobExecutor.execute(anything())).once();
    });

    it('executes a job with firstRunAfter=0 immediately', async () => {
      createJob({ firstRunAfter: 0 });

      await jobScheduler.start();

      await sleep(100);
      verify(await jobExecutor.execute(anything())).once();
    });

    it('stops', async () => {
      createJob();
      await jobScheduler.start();

      await sleep(1100);
      verify(await jobExecutor.execute(anything())).once();

      await jobScheduler.stop();

      await sleep(1100);
      verify(await jobExecutor.execute(anything())).once();
    });

    it('returns job description', async () => {
      const job = createJob();

      when(jobRepository.findOne(deepEqual({ name: job.name }))).thenResolve(toJobDefinition(job));

      const jobDescription = await jobScheduler.getJobDescription();
      expect(jobDescription).toEqual({
        name: job.name,
        interval: job.interval,
        concurrency: job.concurrency,
        maxRunning: job.maxRunning,
      });
    });

    it('returns job description for started job', async () => {
      const job = createJob();
      await jobScheduler.start();

      when(jobRepository.findOne(deepEqual({ name: job.name }))).thenResolve(toJobDefinition(job));

      const jobDescription = await jobScheduler.getJobDescription();
      expect(jobDescription).toEqual({
        name: job.name,
        interval: job.interval,
        concurrency: job.concurrency,
        maxRunning: job.maxRunning,
        schedulerStatus: { interval: job.interval, running: 0 },
      });
    });
  });

  describe('error cases', () => {
    it('throws on non-parsable interval', async () => {
      createJob({ interval: 'not an interval' });

      await expect(async () => jobScheduler.start()).rejects.toThrow(momoError.nonParsableInterval);
    });

    it('reports error when job was removed before scheduling', async () => {
      const job = createJob();
      when(jobRepository.findOne(deepEqual({ name: job.name }))).thenResolve(undefined);

      await jobScheduler.start();

      expect(errorFn).toHaveBeenCalledWith(
        'cannot schedule job',
        MomoErrorType.scheduleJob,
        { name: job.name },
        momoError.jobNotFound
      );
    });

    it('reports unexpected error with mongo', async () => {
      const job = createJob();
      await jobScheduler.start();

      const error = new Error('something unexpected happened');
      when(jobRepository.findOne(deepEqual({ name: job.name }))).thenThrow(error);

      await sleep(1100);

      expect(errorFn).toHaveBeenCalledWith(
        'an unexpected error occurred while executing job',
        MomoErrorType.executeJob,
        { name: job.name },
        error
      );

      expect(jobScheduler.getUnexpectedErrorCount()).toBe(1);
    });
  });

  describe('concurrent job', () => {
    it('executes job thrice', async () => {
      createJob({ concurrency: 3, maxRunning: 3 });
      await jobScheduler.start();

      await sleep(1100);
      verify(await jobExecutor.execute(anything())).thrice();
    });

    it('executes job when no maxRunning is set', async () => {
      const job = createJob({ maxRunning: 0, concurrency: 3 });
      await jobScheduler.start();

      await sleep(2100);
      verify(await jobExecutor.execute(anything())).times(2 * job.concurrency);
    });

    it('executes job only twice if it is already running', async () => {
      const job = createJob({ concurrency: 3, maxRunning: 3 });
      when(executionsRepository.countRunningExecutions(job.name)).thenResolve(1);

      await jobScheduler.start();

      await sleep(1100);
      verify(await jobExecutor.execute(anything())).twice();
    });
  });
});
