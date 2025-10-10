import { DateTime } from 'luxon';
import { ExecutionStatus } from '../../src';
import type { ParsedIntervalSchedule } from '../../src/job/Job';
import type { Logger } from '../../src/logging/Logger';
import { ExecutableIntervalSchedule } from '../../src/scheduler/ExecutableIntervalSchedule';

describe('ExecutableIntervalSchedule', () => {
  const callback = jest.fn();
  const logger: Logger = {
    debug: jest.fn(),
    error: jest.fn(),
  };
  const errorMessage = 'Something went wrong';
  const parsedIntervalSchedule: ParsedIntervalSchedule = {
    interval: '1 second',
    parsedInterval: 1000,
    firstRunAfter: 1000,
    parsedFirstRunAfter: 1000,
  };

  let executableIntervalSchedule: ExecutableIntervalSchedule;

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    executableIntervalSchedule = new ExecutableIntervalSchedule(
      parsedIntervalSchedule,
    );
  });

  afterEach(async () => {
    await executableIntervalSchedule.stop();
  });

  describe('toObject', () => {
    it('converts the schedule to an IntervalSchedule object', async () => {
      expect(executableIntervalSchedule.toObject()).toEqual({
        interval: parsedIntervalSchedule.interval,
        firstRunAfter: parsedIntervalSchedule.firstRunAfter,
      });
    });
  });

  describe('isStarted', () => {
    it('reports that the schedule is not started', async () => {
      expect(executableIntervalSchedule.isStarted()).toBe(false);
    });

    it('reports that the schedule has been started', () => {
      executableIntervalSchedule.execute({ callback, logger, errorMessage });

      expect(executableIntervalSchedule.isStarted()).toBe(true);
    });
  });

  describe('stop', () => {
    it('stops the schedule', async () => {
      executableIntervalSchedule.execute({ callback, logger, errorMessage });
      await executableIntervalSchedule.stop();

      expect(executableIntervalSchedule.isStarted()).toBe(false);
    });
  });

  describe('execute', () => {
    it('returns the correct NextExecutionTime if job has never run before', () => {
      jest.setSystemTime(0);
      const nextExecutionTime = executableIntervalSchedule.execute({
        callback,
        logger,
        errorMessage,
      });

      expect(nextExecutionTime).toEqual({
        nextExecution: DateTime.fromMillis(
          parsedIntervalSchedule.parsedFirstRunAfter,
        ),
      });
    });

    it('returns the correct NextExecutionTime if the job has already run', () => {
      jest.setSystemTime(100);
      const executionInfo = {
        lastStarted: DateTime.fromMillis(50).toString(),
        lastFinished: DateTime.fromMillis(51).toString(),
        lastResult: { status: ExecutionStatus.finished },
      };

      const nextExecutionTime = executableIntervalSchedule.execute({
        callback,
        logger,
        errorMessage,
        executionInfo,
      });

      expect(nextExecutionTime).toEqual({
        nextExecution: DateTime.fromMillis(1050),
      });
    });

    it('schedules the job to run immediately if more time has elapsed since the last run than the interval', () => {
      jest.setSystemTime(2000);
      const executionInfo = {
        lastStarted: DateTime.fromMillis(50).toString(),
        lastFinished: DateTime.fromMillis(51).toString(),
        lastResult: { status: ExecutionStatus.finished },
      };

      const nextExecutionTime = executableIntervalSchedule.execute({
        callback,
        logger,
        errorMessage,
        executionInfo,
      });

      expect(nextExecutionTime).toEqual({
        nextExecution: DateTime.fromMillis(2000),
      });
    });
  });
});
