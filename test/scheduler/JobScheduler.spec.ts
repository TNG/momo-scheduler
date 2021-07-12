import { Clock, install } from '@sinonjs/fake-timers';
import { anything, deepEqual, instance, mock, verify, when } from 'ts-mockito';
import { JobScheduler } from '../../src/scheduler/JobScheduler';
import { JobRepository } from '../../src/repository/JobRepository';
import { Job } from '../../src/job/Job';
import { JobExecutor } from '../../src/executor/JobExecutor';
import { JobEntity } from '../../src/repository/JobEntity';
import { MomoError, MomoErrorType } from '../../src';
import { mockJobRepository } from '../utils/mockJobRepository';
import { loggerForTests } from '../utils/logging';
import clearAllMocks = jest.clearAllMocks;

describe('JobScheduler', () => {
  const defaultJob = {
    name: 'test',
    interval: '1 minute',
    immediate: false,
    concurrency: 1,
    maxRunning: 0,
    handler: jest.fn(),
  };
  const oneMinute = 60 * 1000;
  const errorFn = jest.fn();

  let jobExecutor: JobExecutor;
  let jobRepository: JobRepository;
  let jobScheduler: JobScheduler;
  let clock: Clock;

  beforeEach(() => {
    clearAllMocks();
    clock = install();

    jobExecutor = mock(JobExecutor);
    jobRepository = mockJobRepository();

    when(jobExecutor.execute(anything())).thenResolve();
  });

  afterEach(() => clock.uninstall());

  function createJob(partialJob: Partial<Job> = {}): Job {
    const job = { ...defaultJob, ...partialJob };
    jobScheduler = new JobScheduler(job.name, job.immediate, instance(jobExecutor), loggerForTests(errorFn));
    when(jobRepository.find(deepEqual({ name: job.name }))).thenResolve([JobEntity.from(job)]);
    return job;
  }

  describe('single job', () => {
    it('executes a job', async () => {
      createJob();
      await jobScheduler.start();

      clock.tick(oneMinute);
      verify(await jobExecutor.execute(anything())).once();
    });

    it('executes an immediate job', async () => {
      createJob({ immediate: true });

      await jobScheduler.start();

      clock.tick(10);
      verify(await jobExecutor.execute(anything())).once();
    });

    it('stops', async () => {
      createJob();
      await jobScheduler.start();

      clock.tick(oneMinute);
      verify(await jobExecutor.execute(anything())).once();

      await jobScheduler.stop();

      clock.tick(oneMinute);
      verify(await jobExecutor.execute(anything())).once();
    });
  });

  describe('error cases', () => {
    it('throws on non-parsable interval', async () => {
      createJob({ interval: 'not an interval' });

      await expect(async () => jobScheduler.start()).rejects.toThrow(MomoError.nonParsableInterval);
    });

    it('reports error when job was removed before scheduling', async () => {
      const job = createJob();
      when(jobRepository.find(deepEqual({ name: job.name }))).thenResolve([]);

      await jobScheduler.start();

      expect(errorFn).toHaveBeenCalledWith(
        'cannot schedule job',
        MomoErrorType.scheduleJob,
        { name: job.name },
        MomoError.jobNotFound
      );
    });

    it('reports unexpected error with mongo', async () => {
      const job = createJob();
      await jobScheduler.start();

      const error = new Error('something unexpected happened');
      when(jobRepository.find(deepEqual({ name: job.name }))).thenThrow(error);

      clock.tick(oneMinute);

      expect(errorFn).toHaveBeenCalledWith(
        'an unexpected error occurred while running job',
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

      clock.tick(oneMinute);
      verify(await jobExecutor.execute(anything())).thrice();
    });

    it('executes job when no maxRunning is set', async () => {
      const job = createJob({ maxRunning: 0, concurrency: 3 });
      await jobScheduler.start();

      clock.tick(2 * oneMinute);
      verify(await jobExecutor.execute(anything())).times(2 * job.concurrency);
    });

    it('executes job only twice if it is already running', async () => {
      const job = createJob({ concurrency: 3, maxRunning: 3 });
      const jobEntity = JobEntity.from(job);
      jobEntity.running = 1;
      when(jobRepository.find(deepEqual({ name: job.name }))).thenResolve([jobEntity]);

      await jobScheduler.start();

      clock.tick(oneMinute);
      verify(await jobExecutor.execute(anything())).twice();
    });
  });
});
