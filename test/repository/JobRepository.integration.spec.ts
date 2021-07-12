import { DateTime } from 'luxon';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { ExecutionStatus, MomoJob } from '../../src';
import { connect, disconnect } from '../../src/connect';
import { createJobEntity } from '../utils/createJobEntity';
import { JobRepository } from '../../src/repository/JobRepository';
import { getJobRepository } from '../../src/repository/getJobRepository';

describe('JobRepository', () => {
  const job: MomoJob = {
    name: 'test job',
    interval: 'one minute',
    handler: () => undefined,
  };
  let mongo: MongoMemoryServer;
  let jobRepository: JobRepository;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await connect({ url: await mongo.getUri() });
    jobRepository = getJobRepository();
  });

  beforeEach(async () => await jobRepository.delete({}));

  afterAll(async () => {
    await disconnect();
    await mongo.stop();
  });

  describe('updateJob', () => {
    it('does not overwrite executionInfo', async () => {
      const savedJob = createJobEntity(job);
      savedJob.executionInfo = {
        lastStarted: DateTime.now().toISO(),
        lastFinished: DateTime.now().toISO(),
        lastResult: { status: ExecutionStatus.finished, handlerResult: 'I was executed' },
      };
      await jobRepository.save(savedJob);

      await jobRepository.updateJob(job.name, { interval: 'new interval' });

      const [{ executionInfo }] = await jobRepository.find({ name: job.name });
      expect(executionInfo).toEqual(savedJob.executionInfo);
    });

    it('does not overwrite running', async () => {
      const savedJob = createJobEntity(job);
      savedJob.running = 1;
      await jobRepository.save(savedJob);

      await jobRepository.updateJob(job.name, { interval: 'new interval' });

      const [{ running }] = await jobRepository.find({ name: job.name });
      expect(running).toBe(savedJob.running);
    });

    it('can update maxRunning to 0', async () => {
      const savedJob = createJobEntity({ ...job, maxRunning: 3 });
      await jobRepository.save(savedJob);

      await jobRepository.updateJob(job.name, { maxRunning: 0 });

      const [{ maxRunning }] = await jobRepository.find({ name: job.name });
      expect(maxRunning).toBe(0);
    });
  });

  describe('incrementRunning', () => {
    it('increments when maxRunning is not set', async () => {
      const savedJob = createJobEntity({ ...job, maxRunning: 0 });
      await jobRepository.save(savedJob);

      const incremented = await jobRepository.incrementRunning(job.name, 0);

      expect(incremented).toBe(true);
    });

    it('increments when maxRunning is set', async () => {
      const maxRunning = 2;
      const savedJob = createJobEntity({ ...job, maxRunning });
      await jobRepository.save(savedJob);

      const incremented = await jobRepository.incrementRunning(job.name, maxRunning);

      expect(incremented).toBe(true);
    });

    it('does not increment when maxRunning is reached', async () => {
      const maxRunning = 2;
      const savedJob = createJobEntity({ ...job, maxRunning });
      savedJob.running = 2;
      await jobRepository.save(savedJob);

      const incremented = await jobRepository.incrementRunning(job.name, maxRunning);

      expect(incremented).toBe(false);
    });

    it('does not increment when job does not exist', async () => {
      const incremented = await jobRepository.incrementRunning(job.name, 0);

      expect(incremented).toBe(false);
      expect(await jobRepository.find({ name: job.name })).toHaveLength(0);
    });
  });

  describe('decrementRunning', () => {
    it('decrements', async () => {
      const savedJob = createJobEntity(job);
      savedJob.running = 1;
      await jobRepository.save(savedJob);

      await jobRepository.decrementRunning(job.name);

      const [{ running }] = await jobRepository.find({ name: job.name });
      expect(running).toBe(0);
    });

    it('does not decrement when running is 0', async () => {
      const savedJob = createJobEntity(job);
      await jobRepository.save(savedJob);

      await jobRepository.decrementRunning(job.name);

      const [{ running }] = await jobRepository.find({ name: job.name });
      expect(running).toBe(0);
    });

    it('does nothing when job does not exist', async () => {
      await jobRepository.decrementRunning(job.name);

      expect(await jobRepository.find({ name: job.name })).toHaveLength(0);
    });
  });
});
