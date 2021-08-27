import { DateTime } from 'luxon';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { ExecutionStatus, MomoJob } from '../../src';
import { connect, disconnect } from '../../src/connect';
import { createJobEntity } from '../utils/createJobEntity';
import { JobRepository } from '../../src/repository/JobRepository';
import { getJobRepository } from '../../src/repository/getRepository';

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
    await connect({ url: mongo.getUri() });
    jobRepository = getJobRepository();
  });

  beforeEach(async () => jobRepository.delete({}));

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

      const jobs = await jobRepository.find({ name: job.name });
      expect(jobs[0]?.executionInfo).toEqual(savedJob.executionInfo);
    });

    it('can update maxRunning to 0', async () => {
      const savedJob = createJobEntity({ ...job, maxRunning: 3 });
      await jobRepository.save(savedJob);

      await jobRepository.updateJob(job.name, { maxRunning: 0 });

      const jobs = await jobRepository.find({ name: job.name });
      expect(jobs[0]?.maxRunning).toBe(0);
    });
  });
});
