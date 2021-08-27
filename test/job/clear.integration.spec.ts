import { MongoMemoryServer } from 'mongodb-memory-server';

import { JobRepository } from '../../src/repository/JobRepository';
import { clear } from '../../src';
import { connect, disconnect } from '../../src/connect';
import { createJobEntity } from '../utils/createJobEntity';
import { getJobRepository } from '../../src/repository/getRepository';

describe('clear', () => {
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

  it('removes all jobs from mongo', async () => {
    await jobRepository.save(createJobEntity({ name: 'job 1', interval: '1 minute', handler: () => undefined }));
    await jobRepository.save(createJobEntity({ name: 'job 2', interval: '1 minute', handler: () => undefined }));

    await clear();

    expect(await jobRepository.find({})).toHaveLength(0);
  });
});
