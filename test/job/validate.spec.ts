import { Job, toJob } from '../../src/job/Job';
import { Logger } from '../../src/logging/Logger';
import { MomoErrorType, momoError } from '../../src';
import { validate } from '../../src/job/validate';

describe('validate', () => {
  const logger: Logger = {
    debug: jest.fn(),
    error: jest.fn(),
  };

  beforeEach(async () => jest.clearAllMocks());

  it('validates a job with an interval', () => {
    const job: Job = toJob({ name: 'test', interval: '1 minute', handler: () => 'finished' });
    expect(validate(job, logger)).toBe(true);
  });

  it('validates a job with a cron schedule', () => {
    const job: Job = toJob({ name: 'test', cronSchedule: '0 9 * * 1-5', handler: () => 'finished' });
    expect(validate(job, logger)).toBe(true);
  });

  it('reports error when interval cannot be parsed', () => {
    const job: Job = toJob({ name: 'test', interval: 'not an interval', handler: () => 'finished' });
    expect(validate(job, logger)).toBe(false);

    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledWith(
      'job cannot be defined',
      MomoErrorType.defineJob,
      { name: job.name, interval: job.interval },
      momoError.nonParsableInterval
    );
  });

  it('reports error when interval is not positive', () => {
    const job: Job = toJob({ name: 'test', interval: '-1 minute', handler: () => 'finished' });
    expect(validate(job, logger)).toBe(false);

    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledWith(
      'job cannot be defined',
      MomoErrorType.defineJob,
      { name: job.name, interval: job.interval },
      momoError.nonParsableInterval
    );
  });

  it('reports error when cron schedule cannot be parsed', () => {
    const job: Job = toJob({ name: 'test', cronSchedule: 'not a schedule', handler: () => 'finished' });
    expect(validate(job, logger)).toBe(false);

    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledWith(
      'job cannot be defined',
      MomoErrorType.defineJob,
      { name: job.name, cronSchedule: job.cronSchedule },
      momoError.invalidCronSchedule
    );
  });

  it('reports error when firstRunAfter is invalid', async () => {
    const job: Job = toJob({ name: 'test', interval: '1 minute', handler: () => 'finished', firstRunAfter: -1 });
    expect(validate(job, logger)).toBe(false);

    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledWith(
      'job cannot be defined',
      MomoErrorType.defineJob,
      { name: job.name, firstRunAfter: -1 },
      momoError.invalidFirstRunAfter
    );
  });

  it('reports error when maxRunning is invalid', async () => {
    const job: Job = toJob({ name: 'test', interval: '1 minute', handler: () => 'finished', maxRunning: -1 });
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
    const job: Job = toJob({ name: 'test', interval: '1 minute', handler: () => 'finished', concurrency: 0 });
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
    const job: Job = toJob({
      name: 'test',
      interval: '1 minute',
      handler: () => 'finished',
      concurrency: 3,
      maxRunning: 2,
    });
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
