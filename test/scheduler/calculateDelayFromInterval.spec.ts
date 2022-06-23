import { Clock, install } from '@sinonjs/fake-timers';
import { DateTime } from 'luxon';

import { ExecutionInfo } from '../../src';
import { JobEntity } from '../../src/repository/JobEntity';
import { calculateDelayFromInterval } from '../../src/scheduler/calculateDelayFromInterval';

describe('calculateDelayFromInterval', () => {
  const clock: Clock = install();
  const job: JobEntity = {
    name: 'test',
    interval: 'one second',
    firstRunAfter: 500,
    concurrency: 0,
    maxRunning: 1,
  };

  afterAll(() => clock.reset());

  it('uses configured delay if job was never started before', () => {
    const delay = calculateDelayFromInterval(1000, job);

    expect(delay).toBe(job.firstRunAfter);
  });

  it('calculates delay based on lastStarted', () => {
    job.executionInfo = { lastStarted: DateTime.now().toISO() } as ExecutionInfo;

    clock.tick(500);

    const delay = calculateDelayFromInterval(1000, job);
    expect(delay).toBe(500);
  });
});
