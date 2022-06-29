import { DateTime } from 'luxon';
import { ExecutableIntervalSchedule } from '../../src/scheduler/ExecutableIntervalSchedule';
import { IntervalSchedule } from '../../src/job/MomoJob';
import { Logger } from '../../src/logging/Logger';

describe('ExecutableIntervalSchedule', () => {
  const callbackFunction = jest.fn();
  const logger: Logger = {
    debug: jest.fn(),
    error: jest.fn(),
  };

  let intervalSchedule: IntervalSchedule;
  let executableIntervalSchedule: ExecutableIntervalSchedule;

  beforeEach(() => {
    jest.clearAllMocks();

    intervalSchedule = { interval: '1 second', firstRunAfter: 1000 };
    executableIntervalSchedule = new ExecutableIntervalSchedule(intervalSchedule);
  });

  afterEach(() => {
    executableIntervalSchedule.stop();
  });

  describe('toObject', () => {
    it('converts the schedule to an IntervalSchedule object', async () => {
      expect(executableIntervalSchedule.toObject()).toEqual({
        interval: intervalSchedule.interval,
        firstRunAfter: intervalSchedule.firstRunAfter,
      });
    });
  });

  describe('isStarted', () => {
    it('reports that the schedule is not started', async () => {
      expect(executableIntervalSchedule.isStarted()).toBe(false);
    });

    it('reports that the schedule has been started', () => {
      executableIntervalSchedule.execute(callbackFunction, logger);

      expect(executableIntervalSchedule.isStarted()).toBe(true);
    });
  });

  describe('stop', () => {
    it('stops the schedule', () => {
      executableIntervalSchedule.execute(callbackFunction, logger);
      executableIntervalSchedule.stop();

      expect(executableIntervalSchedule.isStarted()).toBe(false);
    });
  });

  describe('execute', () => {
    beforeAll(() => {
      jest.useFakeTimers();
    });

    afterAll(() => {
      jest.useRealTimers();
    });

    it('returns the correct NextExecutionTime', () => {
      jest.setSystemTime(0);
      const nextExecutionTime = executableIntervalSchedule.execute(callbackFunction, logger);

      expect(nextExecutionTime).toEqual({ nextExecution: DateTime.fromMillis(intervalSchedule.firstRunAfter) });
    });
  });
});
