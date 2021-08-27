import * as typeorm from 'typeorm';
import { Connection, MongoRepository } from 'typeorm';
import { instance, mock } from 'ts-mockito';

import { ExecutionsRepository } from '../../src/repository/ExecutionsRepository';
import { JobRepository } from '../../src/repository/JobRepository';

export function mockRepositories(): { jobRepository: JobRepository; executionsRepository: ExecutionsRepository } {
  const jobRepository = mock(JobRepository);
  const executionsRepository = mock(ExecutionsRepository);
  jest.spyOn(typeorm, 'getConnection').mockReturnValue({
    isConnected: true,
    close: jest.fn(),
    getCustomRepository: (clazz: typeof MongoRepository) => {
      switch (clazz) {
        case JobRepository:
          return instance(jobRepository);
        case ExecutionsRepository:
          return instance(executionsRepository);
        default:
          return undefined;
      }
    },
  } as unknown as Connection);
  return { jobRepository, executionsRepository };
}
