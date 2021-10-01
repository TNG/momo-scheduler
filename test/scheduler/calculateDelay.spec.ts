import { Clock, install } from '@sinonjs/fake-timers';
import { DateTime } from 'luxon';

import { ExecutionInfo } from '../../src';
import { JobEntity } from '../../src/repository/JobEntity';
import { calculateDelay } from '../../src/scheduler/calculateDelay';

describe('calculateDelay', () => {
  const clock: Clock = install();

  afterAll(() => clock.uninstall());

  describe('with undefined delay', () => {
    const job: JobEntity = {
      name: 'test',
      interval: 'one second',
      concurrency: 0,
      maxRunning: 1,
    };

    it('calculates delay if job was never started before', () => {
      const delay = calculateDelay(1000, job);

      expect(delay).toBe(1000);
    });

    it('calculates delay based on lastStarted', () => {
      job.executionInfo = { lastStarted: DateTime.now().toISO() } as ExecutionInfo;

      clock.tick(500);

      const delay = calculateDelay(1000, job);
      expect(delay).toBe(500);
    });
  });

  describe('with delay', () => {
    const job: JobEntity = {
      name: 'test',
      interval: 'one second',
      firstRunAfter: 500,
      concurrency: 0,
      maxRunning: 1,
    };

    it('uses configured delay if job was never started before', () => {
      const delay = calculateDelay(1000, job);

      expect(delay).toBe(job.firstRunAfter);
    });

    it('calculates delay based on lastStarted', () => {
      job.executionInfo = { lastStarted: DateTime.now().toISO() } as ExecutionInfo;

      clock.tick(500);

      const delay = calculateDelay(1000, job);
      expect(delay).toBe(500);
    });
  });
});
