import { toJob } from '../../src/job/Job';
import { MomoJob } from '../../src';

describe('toJob', () => {
  it('sets defaults', () => {
    const job: MomoJob = {
      name: 'test',
      schedule: { interval: '1 second', firstRunAfter: 0 },
      handler: () => undefined,
    };

    expect(toJob(job)).toEqual({
      ...job,
      parsedInterval: 1000,
      concurrency: 1,
      maxRunning: 0,
    });
  });
});
