import { Logger } from '../../src/logging/Logger';
import { MomoErrorType, MomoJob, momoError } from '../../src';
import { validate } from '../../src/job/validate';

describe('validate', () => {
  const logger: Logger = {
    debug: jest.fn(),
    error: jest.fn(),
  };

  beforeEach(async () => jest.clearAllMocks());

  describe('interval job', () => {
    it('validates a job', () => {
      const job: MomoJob = {
        name: 'test',
        schedule: { interval: '1 minute', firstRunAfter: 0 },
        handler: () => 'finished',
      };
      expect(validate(job, logger)).toBe(true);
    });

    it('reports error when interval cannot be parsed', () => {
      const job: MomoJob = {
        name: 'test',
        schedule: { interval: 'not an interval', firstRunAfter: 0 },
        handler: () => 'finished',
      };
      expect(validate(job, logger)).toBe(false);

      expect(logger.error).toHaveBeenCalledTimes(1);
      expect(logger.error).toHaveBeenCalledWith(
        'job cannot be defined',
        MomoErrorType.defineJob,
        { name: job.name, interval: 'not an interval', firstRunAfter: 0 },
        momoError.nonParsableInterval
      );
    });

    it('reports error when interval is not positive', () => {
      const job: MomoJob = {
        name: 'test',
        schedule: { interval: '-1 minute', firstRunAfter: 0 },
        handler: () => 'finished',
      };
      expect(validate(job, logger)).toBe(false);

      expect(logger.error).toHaveBeenCalledTimes(1);
      expect(logger.error).toHaveBeenCalledWith(
        'job cannot be defined',
        MomoErrorType.defineJob,
        { name: job.name, interval: '-1 minute', firstRunAfter: 0 },
        momoError.invalidInterval
      );
    });

    it('reports error when firstRunAfter is invalid', async () => {
      const job: MomoJob = {
        name: 'test',
        schedule: { interval: '1 minute', firstRunAfter: -1 },
        handler: () => 'finished',
      };
      expect(validate(job, logger)).toBe(false);

      expect(logger.error).toHaveBeenCalledTimes(1);
      expect(logger.error).toHaveBeenCalledWith(
        'job cannot be defined',
        MomoErrorType.defineJob,
        { name: job.name, interval: '1 minute', firstRunAfter: -1 },
        momoError.invalidFirstRunAfter
      );
    });

    it('reports error when firstRunAfter cannot be parsed', async () => {
      const job: MomoJob = {
        name: 'test',
        schedule: { interval: '1 minute', firstRunAfter: 'not parseable' },
        handler: () => 'finished',
      };
      expect(validate(job, logger)).toBe(false);

      expect(logger.error).toHaveBeenCalledTimes(1);
      expect(logger.error).toHaveBeenCalledWith(
        'job cannot be defined',
        MomoErrorType.defineJob,
        { name: job.name, interval: '1 minute', firstRunAfter: 'not parseable' },
        momoError.nonParsableFirstRunAfter
      );
    });

    it('reports error when firstRunAfter is parseable but invalid', async () => {
      const job: MomoJob = {
        name: 'test',
        schedule: { interval: '1 minute', firstRunAfter: '-1 minute' },
        handler: () => 'finished',
      };
      expect(validate(job, logger)).toBe(false);

      expect(logger.error).toHaveBeenCalledTimes(1);
      expect(logger.error).toHaveBeenCalledWith(
        'job cannot be defined',
        MomoErrorType.defineJob,
        { name: job.name, interval: '1 minute', firstRunAfter: '-1 minute' },
        momoError.invalidFirstRunAfter
      );
    });
  });

  describe('cron job', () => {
    it('validates a job', () => {
      const job: MomoJob = {
        name: 'test',
        schedule: { cronSchedule: '0 9 * * 1-5' },
        handler: () => 'finished',
      };
      expect(validate(job, logger)).toBe(true);
    });

    it('reports error when cron schedule cannot be parsed', () => {
      const job: MomoJob = {
        name: 'test',
        schedule: { cronSchedule: 'not a schedule' },
        handler: () => 'finished',
      };
      expect(validate(job, logger)).toBe(false);

      expect(logger.error).toHaveBeenCalledTimes(1);
      expect(logger.error).toHaveBeenCalledWith(
        'job cannot be defined',
        MomoErrorType.defineJob,
        { name: job.name, cronSchedule: 'not a schedule' },
        momoError.nonParsableCronSchedule
      );
    });
  });

  it('reports error when maxRunning is invalid', async () => {
    const job: MomoJob = {
      name: 'test',
      schedule: { interval: '1 minute', firstRunAfter: 0 },
      handler: () => 'finished',
      maxRunning: -1,
    };
    expect(validate(job, logger)).toBe(false);

    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledWith(
      'job cannot be defined',
      MomoErrorType.defineJob,
      { name: job.name, maxRunning: -1 },
      momoError.invalidMaxRunning
    );
  });

  it('reports error when concurrency is invalid', async () => {
    const job: MomoJob = {
      name: 'test',
      schedule: { interval: '1 minute', firstRunAfter: 0 },
      handler: () => 'finished',
      concurrency: 0,
    };
    expect(validate(job, logger)).toBe(false);

    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledWith(
      'job cannot be defined',
      MomoErrorType.defineJob,
      { name: job.name, concurrency: job.concurrency },
      momoError.invalidConcurrency
    );
  });

  it('reports error when concurrency > maxRunning', async () => {
    const job: MomoJob = {
      name: 'test',
      schedule: { interval: '1 minute', firstRunAfter: 0 },
      handler: () => 'finished',
      concurrency: 3,
      maxRunning: 2,
    };
    expect(validate(job, logger)).toBe(false);

    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledWith(
      'job cannot be defined',
      MomoErrorType.defineJob,
      { name: job.name, concurrency: job.concurrency, maxRunning: job.maxRunning },
      momoError.invalidConcurrency
    );
  });
});
