import { Clock, install } from '@sinonjs/fake-timers';
import { DateTime } from 'luxon';

import { ExecutionInfo } from '../../src';
import { JobEntity } from '../../src/repository/JobEntity';
import { calculateDelay } from '../../src/scheduler/calculateDelay';

describe('calculateDelay', () => {
  let job: JobEntity;
  let clock: Clock;

  beforeEach(() => {
    job = {
      name: 'test',
      interval: 'one second',
      delay: 100,
      concurrency: 0,
      maxRunning: 1,
    };
    clock = install();
  });

  afterEach(() => clock.uninstall());

  describe('immediate=false', () => {
    it('calculates delay if job was never started before (ignores configured delay)', () => {
      const delay = calculateDelay(1000, false, job);

      expect(delay).toBe(1000);
    });

    it('calculates delay based on lastStarted', () => {
      job.executionInfo = { lastStarted: DateTime.now().toISO() } as ExecutionInfo;

      clock.tick(500);

      const delay = calculateDelay(1000, false, job);
      expect(delay).toBe(500);
    });
  });

  describe('immediate=true', () => {
    it('uses configured delay if job was never started before', () => {
      const delay = calculateDelay(1000, true, job);

      expect(delay).toBe(job.delay);
    });

    it('calculates delay based on lastStarted', () => {
      job.executionInfo = { lastStarted: DateTime.now().toISO() } as ExecutionInfo;

      clock.tick(500);

      const delay = calculateDelay(1000, true, job);
      expect(delay).toBe(500);
    });
  });
});
