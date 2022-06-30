import { DateTime } from 'luxon';
import { noop } from 'lodash';

import { ExecutableIntervalSchedule } from '../../src/scheduler/ExecutableIntervalSchedule';
import { Logger } from '../../src/logging/Logger';
import { ExecutionStatus } from '../../src';

describe('ExecutableIntervalSchedule', () => {
  const callbackFunction = async (): Promise<void> => noop();
  const logger: Logger = {
    debug: jest.fn(),
    error: jest.fn(),
  };
  const errorMessage = 'Something went wrong';

  const intervalSchedule = { interval: '1 second', firstRunAfter: 1000 };
  let executableIntervalSchedule: ExecutableIntervalSchedule;

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    executableIntervalSchedule = new ExecutableIntervalSchedule(intervalSchedule);
  });

  afterEach(() => {
    executableIntervalSchedule.stop();
  });

  describe('toObject', () => {
    it('converts the schedule to an IntervalSchedule object', async () => {
      expect(executableIntervalSchedule.toObject()).toEqual(intervalSchedule);
    });
  });

  describe('isStarted', () => {
    it('reports that the schedule is not started', async () => {
      expect(executableIntervalSchedule.isStarted()).toBe(false);
    });

    it('reports that the schedule has been started', () => {
      executableIntervalSchedule.execute(callbackFunction, logger, errorMessage);

      expect(executableIntervalSchedule.isStarted()).toBe(true);
    });
  });

  describe('stop', () => {
    it('stops the schedule', () => {
      executableIntervalSchedule.execute(callbackFunction, logger, errorMessage);
      executableIntervalSchedule.stop();

      expect(executableIntervalSchedule.isStarted()).toBe(false);
    });
  });

  describe('execute', () => {
    it('returns the correct NextExecutionTime if job has never run before', () => {
      jest.setSystemTime(0);
      const nextExecutionTime = executableIntervalSchedule.execute(callbackFunction, logger, errorMessage);

      expect(nextExecutionTime).toEqual({ nextExecution: DateTime.fromMillis(intervalSchedule.firstRunAfter) });
    });

    it('returns the correct NextExecutionTime if the job has already run', () => {
      jest.setSystemTime(100);
      const executionInfo = {
        lastStarted: DateTime.fromMillis(50).toString(),
        lastFinished: DateTime.fromMillis(51).toString(),
        lastResult: { status: ExecutionStatus.finished },
      };

      const nextExecutionTime = executableIntervalSchedule.execute(
        callbackFunction,
        logger,
        errorMessage,
        executionInfo
      );

      expect(nextExecutionTime).toEqual({ nextExecution: DateTime.fromMillis(1050) });
    });

    it('schedules the job to run immediately if more time has elapsed since the last run than the interval', () => {
      jest.setSystemTime(2000);
      const executionInfo = {
        lastStarted: DateTime.fromMillis(50).toString(),
        lastFinished: DateTime.fromMillis(51).toString(),
        lastResult: { status: ExecutionStatus.finished },
      };

      const nextExecutionTime = executableIntervalSchedule.execute(
        callbackFunction,
        logger,
        errorMessage,
        executionInfo
      );

      expect(nextExecutionTime).toEqual({ nextExecution: DateTime.fromMillis(2000) });
    });
  });
});
