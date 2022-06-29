import { DateTime } from 'luxon';
import { noop } from 'lodash';
import { ExecutableCronSchedule } from '../../src/scheduler/ExecutableCronSchedule';

describe('ExecutableIntervalSchedule', () => {
  const callbackFunction = async (): Promise<void> => noop();

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

  afterEach(() => {
    executableCronSchedule.stop();
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
      executableCronSchedule.execute(callbackFunction);

      expect(executableCronSchedule.isStarted()).toBe(true);
    });
  });

  describe('stop', () => {
    it('stops the schedule', () => {
      executableCronSchedule.execute(callbackFunction);
      executableCronSchedule.stop();

      expect(executableCronSchedule.isStarted()).toBe(false);
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
      const nextExecutionTime = executableCronSchedule.execute(callbackFunction);

      expect(nextExecutionTime).toEqual({ nextExecution: DateTime.fromMillis(1000) });
    });
  });
});
