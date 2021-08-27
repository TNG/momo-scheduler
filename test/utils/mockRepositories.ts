import { instance, mock } from 'ts-mockito';

import { ExecutionsRepository } from '../../src/repository/ExecutionsRepository';
import { JobRepository } from '../../src/repository/JobRepository';

export function mockRepositories() {
  const executionsRepository = mock(ExecutionsRepository);
  const jobRepository = mock(JobRepository);

  jest.mock('../../src/repository/getRepository', () => {
    return {
      getExecutionsRepository: () => instance(executionsRepository),
      getJobRepository: () => instance(jobRepository),
    };
  });

  return { executionsRepository, jobRepository };
}
