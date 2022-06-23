import { toJob } from '../../src/job/Job';
import { MomoJob } from '../../src';

describe('fromMomoJob', () => {
  it('sets defaults', () => {
    const job: MomoJob = {
      name: 'test',
      schedule: { interval: '1 second', firstRunAfter: 0 },
      handler: () => undefined,
    };

    expect(toJob(job)).toEqual({
      ...job,
      concurrency: 1,
      maxRunning: 0,
    });
  });
});
