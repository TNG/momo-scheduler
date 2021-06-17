import { DateTime } from 'luxon';
import { deepEqual, when } from 'ts-mockito';

import { mockJobRepository } from '../utils/mockJobRepository';
import { check, ExecutionInfo, ExecutionStatus } from '../../src';
import { JobEntity } from '../../src/repository/JobEntity';

describe('check', () => {
  const name = 'test';

  afterEach(() => jest.resetAllMocks());

  it('returns executionInfo', async () => {
    const jobRepository = mockJobRepository();

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
    mockJobRepository();
    expect(await check(name)).toBeUndefined();
  });

  it('returns nothing if not connected', async () => {
    expect(await check(name)).toBeUndefined();
  });
});
