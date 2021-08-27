import { toJob } from '../../src/job/Job';

describe('fromMomoJob', () => {
  it('sets defaults', () => {
    const job = { name: 'test', interval: '1 second', handler: () => undefined };
    expect(toJob(job)).toMatchObject({
      ...job,
      immediate: false,
      concurrency: 1,
      maxRunning: 0,
    });
  });
});
