import { instance, mock } from 'ts-mockito';
import { JobRepository } from '../../src/repository/JobRepository';
import { ExecutionsRepository } from '../../src/repository/ExecutionsRepository';
import { connectForTest } from '../../src/connect';
import { MongoClient } from 'mongodb';

export function mockRepositories(): { jobRepository: JobRepository; executionsRepository: ExecutionsRepository } {
  connectForTest(instance(mock(MongoClient)));

  const jobRepository = mock(JobRepository);
  const executionsRepository = mock(ExecutionsRepository);

  jest.mock('../../src/repository/getRepository', {
    getJobRepository: () => instance(jobRepository),
    getExecutionsRepository: () => instance(executionsRepository),
  } as any);

  return { jobRepository, executionsRepository };
}
