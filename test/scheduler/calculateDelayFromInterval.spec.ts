import { Clock, install } from '@sinonjs/fake-timers';
import { DateTime } from 'luxon';

import { ExecutionInfo } from '../../src';
import { JobEntity } from '../../src/repository/JobEntity';
import { calculateDelayFromInterval } from '../../src/scheduler/calculateDelayFromInterval';

describe('calculateDelayFromInterval', () => {
  const clock: Clock = install();
  const firstRunAfter = 500;
  const job: JobEntity = {
    name: 'test',
    schedule: { interval: 'one second', firstRunAfter },
    concurrency: 0,
    maxRunning: 1,
  };

  afterAll(() => clock.reset());

  it('uses configured delay if job was never started before', () => {
    const delay = calculateDelayFromInterval(1000, job, firstRunAfter);

    expect(delay).toBe(firstRunAfter);
  });

  it('calculates delay based on lastStarted', () => {
    job.executionInfo = { lastStarted: DateTime.now().toISO() } as ExecutionInfo;

    clock.tick(firstRunAfter);

    const delay = calculateDelayFromInterval(1000, job, firstRunAfter);
    expect(delay).toBe(firstRunAfter);
  });
});
