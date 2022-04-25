import { toJob } from '../../src/job/Job';
import { MomoJob } from '../../src';

describe('fromMomoJob', () => {
  it('sets defaults', () => {
    const job: MomoJob = { name: 'test', interval: '1 second', handler: () => undefined };

    expect(toJob(job)).toEqual({
      ...job,
      firstRunAfter: 0,
      concurrency: 1,
      maxRunning: 0,
    });
  });
});
