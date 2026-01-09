import { DateTime } from 'luxon';
import type { Logger } from '../../src/logging/Logger';
import { ExecutableCronSchedule } from '../../src/scheduler/ExecutableCronSchedule';

describe('ExecutableIntervalSchedule', () => {
  const callback = jest.fn();
  const logger: Logger = {
    debug: jest.fn(),
    error: jest.fn(),
  };
  const errorMessage = 'Something went wrong';
  const cronSchedule = { cronSchedule: '* * * * * *' };

  let executableCronSchedule: ExecutableCronSchedule;

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
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
      jest.setSystemTime(0);
      const nextExecutionTime = executableCronSchedule.execute({
        callback,
        logger,
        errorMessage,
      });

      expect(nextExecutionTime).toEqual({
        nextExecution: DateTime.fromMillis(1000),
      });
    });
  });
});
