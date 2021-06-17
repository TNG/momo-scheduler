import { withDefaults } from '../../src/job/withDefaults';

describe('withDefaults', () => {
  it('sets defaults', () => {
    const job = { name: 'test', interval: '1 second', handler: () => undefined };
    expect(withDefaults(job)).toMatchObject({
      ...job,
      immediate: false,
      concurrency: 1,
      maxRunning: 0,
    });
  });
});
