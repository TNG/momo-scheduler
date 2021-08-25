import { DateTime } from 'luxon';
import { anything, capture, deepEqual, verify, when } from 'ts-mockito';

import { JobRepository } from '../../src/repository/JobRepository';
import { keepLatest } from '../../src/job/keepLatest';
import { JobEntity } from '../../src/repository/JobEntity';
import { ExecutionInfo } from '../../src';
import { mockRepositories } from '../utils/mockRepositories';

describe('keepLatest', () => {
  const name = 'test';
  let jobRepository: JobRepository;

  beforeAll(() => {
    jobRepository = mockRepositories().jobRepository;
  });

  afterEach(() => jest.clearAllMocks());

  it('removes all duplicate jobs except latest', async () => {
    const duplicate = { name } as JobEntity;
    const latest = { name, executionInfo: { lastFinished: DateTime.now().toISO() } as ExecutionInfo } as JobEntity;

    when(jobRepository.find(deepEqual({ name }))).thenResolve([duplicate, latest]);

    const kept = await keepLatest(name);

    expect(kept).toBe(latest);
    verify(jobRepository.delete(anything())).once();
    const [removedJobs] = capture(jobRepository.delete).last();
    expect(removedJobs).toEqual([duplicate]);
  });

  it('returns a job without duplicates', async () => {
    const job = { name } as JobEntity;
    when(jobRepository.find(deepEqual({ name }))).thenResolve([job]);

    expect(await keepLatest(name)).toEqual(job);
  });

  it('returns undefined when no job is found', async () => {
    when(jobRepository.find(deepEqual({ name }))).thenResolve([]);

    expect(await keepLatest(name)).toBeUndefined();
  });
});
