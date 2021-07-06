import { deepEqual, verify, when } from 'ts-mockito';
import { JobRepository } from '../../src/repository/JobRepository';
import { MomoJob, MongoSchedule } from '../../src';
import { withDefaults } from '../../src/job/withDefaults';
import { mockJobRepository } from '../utils/mockJobRepository';
import { createJobEntity } from '../utils/createJobEntity';
import { initLoggingForTests } from '../utils/logging';
import { ExecutionStatus, MomoEvent } from '../../src';
import { JobEntity } from '../../src/repository/JobEntity';
import { Job } from '../../src/job/Job';

describe('MongoSchedule', () => {
  const job: MomoJob = {
    name: 'test job',
    interval: 'one minute',
    handler: jest.fn(),
  };

  let jobRepository: JobRepository;
  let mongoSchedule: MongoSchedule;

  beforeEach(async () => {
    jest.clearAllMocks();

    jobRepository = mockJobRepository();
    when(jobRepository.find(deepEqual({ name: job.name }))).thenResolve([]);

    mongoSchedule = await MongoSchedule.connect({
      url: 'mongodb://does.not/matter',
    });
    mongoSchedule.cancel();

    initLoggingForTests(mongoSchedule);
  });

  it('emits logs', async () => {
    let caughtEvent: MomoEvent | undefined;
    mongoSchedule.on('debug', (event: MomoEvent) => (caughtEvent = event));

    await mongoSchedule.start();

    expect(caughtEvent).toEqual({ message: 'start all jobs', data: { count: 0 } });
  });

  it('saves job with defaults', async () => {
    await mongoSchedule.define(job);

    expect(mongoSchedule.list()).toHaveLength(1);
  });

  it('updates job', async () => {
    when(jobRepository.find(deepEqual({ name: job.name }))).thenResolve([createJobEntity(job)]);

    const newInterval = 'two minutes';
    await mongoSchedule.define({ ...job, interval: newInterval });

    expect(mongoSchedule.list()).toHaveLength(1);
  });

  it('lists jobs', async () => {
    await mongoSchedule.define(job);

    expect(mongoSchedule.list()).toEqual([withDefaults(job)]);
  });

  it('cancels jobs', async () => {
    await mongoSchedule.define(job);
    mongoSchedule.cancel();

    expect(mongoSchedule.list()).toHaveLength(0);
  });

  it('cancels a job', async () => {
    const name = 'keep me';
    when(jobRepository.find(deepEqual({ name }))).thenResolve([]);

    const jobToKeep = { ...job, name };
    await mongoSchedule.define(jobToKeep);
    await mongoSchedule.define(job);

    mongoSchedule.cancelJob(job.name);

    const jobs = mongoSchedule.list();
    expect(jobs).toEqual([withDefaults(jobToKeep)]);
  });

  it('does not report error when concurrency > maxRunning but maxRunning is not set', async () => {
    await mongoSchedule.define({ ...job, concurrency: 3 });

    verify(
      jobRepository.save(deepEqual(JobEntity.from({ ...job, maxRunning: 0, concurrency: 3, immediate: false } as Job)))
    ).once();
  });

  it('counts jobs', async () => {
    await mongoSchedule.define(job);

    expect(mongoSchedule.count()).toBe(1);
  });

  it('counts started jobs', async () => {
    const name = 'not started';
    when(jobRepository.find(deepEqual({ name }))).thenResolve([]);

    const notStartedJob = { ...job, name };
    await mongoSchedule.define(notStartedJob);
    await mongoSchedule.define(job);

    await mongoSchedule.startJob(job.name);

    expect(mongoSchedule.count()).toBe(2);
    expect(mongoSchedule.count(true)).toBe(1);
  });

  it('does nothing if a job is started that is not on the schedule', async () => {
    await mongoSchedule.startJob('not defined');

    expect(mongoSchedule.count()).toBe(0);
    expect(mongoSchedule.count(true)).toBe(0);
  });

  it('removes jobs', async () => {
    await mongoSchedule.define(job);
    await mongoSchedule.remove();

    expect(mongoSchedule.list()).toHaveLength(0);

    verify(jobRepository.deleteMany(deepEqual({ where: { name: { $in: [job.name] } } }))).once();
  });

  it('removes a job', async () => {
    const name = 'keep me';
    when(jobRepository.find(deepEqual({ name: name }))).thenResolve([]);

    await mongoSchedule.define(job);

    const jobToKeep = { ...job, name };
    await mongoSchedule.define(jobToKeep);

    await mongoSchedule.removeJob(job.name);

    const jobs = mongoSchedule.list();
    expect(jobs).toEqual([withDefaults(jobToKeep)]);

    verify(jobRepository.delete(deepEqual({ name: job.name }))).once();
  });

  it('runs a job once', async () => {
    await mongoSchedule.define(job);

    when(jobRepository.find(deepEqual({ name: job.name }))).thenResolve([createJobEntity(job)]);
    when(jobRepository.incrementRunning(job.name, 0)).thenResolve(true);

    const result = await mongoSchedule.run(job.name);

    expect(result).toEqual({ status: ExecutionStatus.finished });
    expect(job.handler).toHaveBeenCalledTimes(1);
  });

  it('skips running job once when job is not found', async () => {
    const result = await mongoSchedule.run('not defined');

    expect(result).toEqual({ status: ExecutionStatus.notFound });
  });

  it('skips running job once when job is not found in repository', async () => {
    await mongoSchedule.define(job);

    when(jobRepository.find(deepEqual({ name: job.name }))).thenResolve([]);

    const result = await mongoSchedule.run(job.name);

    expect(result).toEqual({ status: ExecutionStatus.notFound });
  });

  it('skips running job once when maxRunning is reached', async () => {
    await mongoSchedule.define(job);

    when(jobRepository.find(deepEqual({ name: job.name }))).thenResolve([createJobEntity(job)]);
    when(jobRepository.incrementRunning(job.name, 0)).thenResolve(false);

    const result = await mongoSchedule.run(job.name);

    expect(result).toEqual({ status: ExecutionStatus.maxRunningReached });
    expect(job.handler).toHaveBeenCalledTimes(0);
  });
});
