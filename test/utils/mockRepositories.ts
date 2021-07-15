import { instance, mock } from 'ts-mockito';
import * as typeorm from 'typeorm';
import { Connection, MongoRepository } from 'typeorm';
import { JobRepository } from '../../src/repository/JobRepository';
import { ExecutionRepository } from '../../src/repository/ExecutionRepository';

export function mockRepositories(): { jobRepository: JobRepository; executionRepository: ExecutionRepository } {
  const jobRepository = mock(JobRepository);
  const executionRepository = mock(ExecutionRepository);
  jest.spyOn(typeorm, 'getConnection').mockReturnValue(({
    isConnected: true,
    getCustomRepository: (clazz: typeof MongoRepository) => {
      switch (clazz) {
        case JobRepository:
          return instance(jobRepository);
        case ExecutionRepository:
          return instance(executionRepository);
        default:
          return undefined;
      }
    },
  } as unknown) as Connection);
  return { jobRepository, executionRepository };
}
