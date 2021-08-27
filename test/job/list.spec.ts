import { when } from 'ts-mockito';

import { ExecutionInfo, list } from '../../src';
import { mockRepositories } from '../utils/mockRepositories';

describe('list', () => {
  afterEach(() => jest.resetAllMocks());

  it('returns jobs', async () => {
    const jobRepository = mockRepositories().jobRepository;

    const job1 = {
      name: 'job1',
      interval: '1 minute',
      executionInfo: {} as ExecutionInfo,
      running: 2,
      concurrency: 1,
      maxRunning: 3,
    };
    const job2 = {
      name: 'job2',
      interval: '2 minutes',
      executionInfo: {} as ExecutionInfo,
      running: 0,
      concurrency: 1,
      maxRunning: 0,
    };
    when(jobRepository.find()).thenResolve([job1, job2]);

    const jobs = await list();

    expect(jobs).toEqual([
      {
        name: job1.name,
        interval: job1.interval,
        concurrency: job1.concurrency,
        maxRunning: job1.maxRunning,
        executionInfo: {},
      },
      {
        name: job2.name,
        interval: job2.interval,
        concurrency: job2.concurrency,
        maxRunning: job2.maxRunning,
        executionInfo: {},
      },
    ]);
  });

  it('returns nothing if not connected', async () => {
    expect(await list()).toHaveLength(0);
  });
});
