import { Clock, install } from '@sinonjs/fake-timers';
import { anything, deepEqual, instance, mock, verify, when } from 'ts-mockito';
import { JobScheduler } from '../../src/scheduler/JobScheduler';
import { JobRepository } from '../../src/repository/JobRepository';
import { Job } from '../../src/job/Job';
import { JobExecutor } from '../../src/executor/JobExecutor';
import { JobEntity } from '../../src/repository/JobEntity';
import { MomoError, MomoErrorType } from '../../src';
import { mockJobRepository } from '../utils/mockJobRepository';
import clearAllMocks = jest.clearAllMocks;
import { loggerForTests } from '../utils/logging';

describe('JobScheduler', () => {
  let job: Job;
  let jobExecutor: JobExecutor;
  let jobRepository: JobRepository;
  let jobScheduler: JobScheduler;
  let clock: Clock;
  const oneMinute = 60 * 1000;
  const errorFn = jest.fn();

  beforeEach(() => {
    clearAllMocks();
    clock = install();

    job = {
      name: 'test',
      interval: '1 minute',
      immediate: false,
      concurrency: 1,
      maxRunning: 0,
      handler: jest.fn(),
    };

    jobExecutor = mock(JobExecutor);
    jobRepository = mockJobRepository();

    jobScheduler = new JobScheduler(job, instance(jobExecutor), loggerForTests(errorFn));

    when(jobExecutor.execute(anything())).thenResolve();
    when(jobRepository.find(deepEqual({ name: job.name }))).thenResolve([JobEntity.from(job)]);
  });

  afterEach(() => clock.uninstall());

  describe('single job', () => {
    it('executes a job', async () => {
      await jobScheduler.run();

      clock.tick(oneMinute);
      verify(await jobExecutor.execute(anything())).once();
    });

    it('executes an immediate job', async () => {
      job.immediate = true;

      await jobScheduler.run();

      clock.tick(10);
      verify(await jobExecutor.execute(anything())).once();
    });

    it('stops', async () => {
      await jobScheduler.run();

      clock.tick(oneMinute);
      verify(await jobExecutor.execute(anything())).once();

      await jobScheduler.stop();

      clock.tick(oneMinute);
      verify(await jobExecutor.execute(anything())).once();
    });
  });

  describe('error cases', () => {
    it('throws on non-parsable interval', async () => {
      job.interval = 'not an interval';

      await expect(async () => jobScheduler.run()).rejects.toThrow(MomoError.nonParsableInterval);
    });

    it('reports error when job was removed before scheduling', async () => {
      when(jobRepository.find(deepEqual({ name: job.name }))).thenResolve([]);

      await jobScheduler.run();

      expect(errorFn).toHaveBeenCalledWith(
        'cannot schedule job',
        MomoErrorType.scheduleJob,
        { name: job.name },
        MomoError.jobNotFound
      );
    });

    it('reports unexpected error with mongo', async () => {
      await jobScheduler.run();

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
    beforeEach(() => {
      job.concurrency = 3;
      job.maxRunning = 3;
      when(jobRepository.find(deepEqual({ name: job.name }))).thenResolve([JobEntity.from(job)]);
    });

    it('executes job thrice', async () => {
      await jobScheduler.run();

      clock.tick(oneMinute);
      verify(await jobExecutor.execute(anything())).thrice();
    });

    it('executes job when no maxRunning is set', async () => {
      job.maxRunning = 0;
      await jobScheduler.run();

      clock.tick(2 * oneMinute);
      verify(await jobExecutor.execute(anything())).times(2 * job.concurrency);
    });

    it('executes job only twice if it is already running', async () => {
      const jobEntity = JobEntity.from(job);
      jobEntity.running = 1;
      when(jobRepository.find(deepEqual({ name: job.name }))).thenResolve([jobEntity]);

      await jobScheduler.run();

      clock.tick(oneMinute);
      verify(await jobExecutor.execute(anything())).twice();
    });
  });
});
