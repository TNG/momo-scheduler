import { instance, mock } from 'ts-mockito';
import * as typeorm from 'typeorm';
import { Connection } from 'typeorm';
import { JobRepository } from '../../src/repository/JobRepository';

export function mockJobRepository(): JobRepository {
  const jobRepository = mock(JobRepository);
  jest.spyOn(typeorm, 'getConnection').mockReturnValue(({
    isConnected: true,
    getCustomRepository: () => instance(jobRepository),
  } as unknown) as Connection);
  return jobRepository;
}
