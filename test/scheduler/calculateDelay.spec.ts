import { Clock, install } from '@sinonjs/fake-timers';
import { DateTime } from 'luxon';

import { ExecutionInfo } from '../../src';
import { JobEntity } from '../../src/repository/JobEntity';
import { calculateDelay } from '../../src/scheduler/calculateDelay';

describe('calculateDelay', () => {
  const clock: Clock = install();
  const job: JobEntity = {
    name: 'test',
    interval: 'one second',
    firstRunAfter: 500,
    concurrency: 0,
    maxRunning: 1,
  };

  afterAll(() => clock.reset());

  it('uses configured firstRunAfter if job was never started before', () => {
    const delay = calculateDelay(1000, job);

    expect(delay).toBe(job.firstRunAfter);
  });

  it('parses configured firstRunAfter if job was never started before', () => {
    const delay = calculateDelay(1000, { ...job, firstRunAfter: '1 second' });

    expect(delay).toBe(1000);
  });

  it('calculates delay based on lastStarted', () => {
    job.executionInfo = { lastStarted: DateTime.now().toISO() } as ExecutionInfo;

    clock.tick(500);

    const delay = calculateDelay(1000, job);
    expect(delay).toBe(500);
  });
});
