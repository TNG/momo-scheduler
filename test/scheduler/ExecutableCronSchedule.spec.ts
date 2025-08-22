import { DateTime } from 'luxon';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { ExecutableCronSchedule } from '../../src/scheduler/ExecutableCronSchedule';
import { Logger } from '../../src/logging/Logger';

describe('ExecutableIntervalSchedule', () => {
  const callback = vi.fn();
  const logger: Logger = {
    debug: vi.fn(),
    error: vi.fn(),
  };
  const errorMessage = 'Something went wrong';
  const cronSchedule = { cronSchedule: '* * * * * *' };

  let executableCronSchedule: ExecutableCronSchedule;

  beforeAll(() => {
    vi.useFakeTimers();
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  beforeEach(() => {
    executableCronSchedule = new ExecutableCronSchedule(cronSchedule);
  });

  afterEach(async () => {
    await executableCronSchedule.stop();
  });

  describe('toObject', () => {
    it('converts the schedule to an IntervalSchedule object', async () => {
      expect(executableCronSchedule.toObject()).toEqual(cronSchedule);
    });
  });

  describe('isStarted', () => {
    it('reports that the schedule is not started', async () => {
      expect(executableCronSchedule.isStarted()).toBe(false);
    });

    it('reports that the schedule has been started', () => {
      executableCronSchedule.execute({ callback, logger, errorMessage });

      expect(executableCronSchedule.isStarted()).toBe(true);
    });
  });

  describe('stop', () => {
    it('stops the schedule', async () => {
      executableCronSchedule.execute({ callback, logger, errorMessage });
      await executableCronSchedule.stop();

      expect(executableCronSchedule.isStarted()).toBe(false);
    });
  });

  describe('execute', () => {
    it('returns the correct NextExecutionTime', () => {
      vi.setSystemTime(0);
      const nextExecutionTime = executableCronSchedule.execute({ callback, logger, errorMessage });

      expect(nextExecutionTime).toEqual({ nextExecution: DateTime.fromMillis(1000) });
    });
  });
});
