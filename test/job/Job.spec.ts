import { toJob } from '../../src/job/Job';
import { MomoJob } from '../../src';

describe('toJob', () => {
  it('sets defaults', () => {
    const job: MomoJob = {
      name: 'test',
      schedule: { interval: '1 second' },
      handler: () => undefined,
    };

    expect(toJob(job)).toEqual({
      ...job,
      schedule: { interval: '1 second', parsedInterval: 1000, firstRunAfter: 0, parsedFirstRunAfter: 0 },
      concurrency: 1,
      maxRunning: 0,
    });
  });

  // TODO add more test cases
});
