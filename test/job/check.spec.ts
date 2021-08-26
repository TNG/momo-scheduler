import { DateTime } from 'luxon';
import { anyString, deepEqual, instance, mock, when } from 'ts-mockito';

import { check, clear, ExecutionInfo, ExecutionStatus } from '../../src';
import { JobEntity } from '../../src/repository/JobEntity';
import { JobRepository } from '../../src/repository/JobRepository';

let jobRepository: JobRepository;
jest.mock('../../src/repository/getRepository', () => {
  return {
    getJobRepository: () => instance(jobRepository),
  };
});

describe('check', () => {
  const name = 'test';

  beforeEach(() => {
    jobRepository = mock(JobRepository);
    when(jobRepository.findOne(anyString())).thenResolve(undefined);
  });

  afterEach(async () => {
    jest.resetAllMocks();
    await clear();
  });

  it('returns executionInfo', async () => {
    const executionInfo: ExecutionInfo = {
      lastStarted: DateTime.now().toISO(),
      lastFinished: DateTime.now().toISO(),
      lastResult: { status: ExecutionStatus.finished },
    };
    when(jobRepository.findOne(deepEqual({ name }))).thenResolve({ name, executionInfo } as JobEntity);

    const result = await check(name);

    expect(result).toEqual(executionInfo);
  });

  it('returns nothing if job not found', async () => {
    expect(await check(name)).toBeUndefined();
  });
});
