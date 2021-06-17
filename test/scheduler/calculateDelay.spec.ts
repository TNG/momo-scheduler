import { Clock, install } from '@sinonjs/fake-timers';
import { DateTime } from 'luxon';
import { JobEntity } from '../../src/repository/JobEntity';
import { calculateDelay } from '../../src/scheduler/calculateDelay';
import { Job } from '../../src/job/Job';
import { ExecutionInfo } from '../../src';

describe('calculateDelay', () => {
  let job: JobEntity;
  let clock: Clock;

  beforeEach(() => {
    job = JobEntity.from({ name: 'test', interval: 'one second' } as Job);
    clock = install();
  });

  afterEach(() => clock.uninstall());

  describe('immediate=false', () => {
    it('calculates delay when job was never started before', () => {
      const delay = calculateDelay(1000, false, job);

      expect(delay).toBe(1000);
    });

    it('calculates delay when job was started before', () => {
      job.executionInfo = { lastStarted: DateTime.now().toISO() } as ExecutionInfo;

      clock.tick(500);

      const delay = calculateDelay(1000, false, job);
      expect(delay).toBe(500);
    });
  });

  describe('immediate=true', () => {
    it('calculates delay when job was never started before', () => {
      const delay = calculateDelay(1000, true, job);

      expect(delay).toBe(0);
    });

    it('calculates delay when job was started before', () => {
      job.executionInfo = { lastStarted: DateTime.now().toISO() } as ExecutionInfo;

      clock.tick(500);

      const delay = calculateDelay(1000, true, job);
      expect(delay).toBe(500);
    });
  });
});
