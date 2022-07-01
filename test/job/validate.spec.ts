import { err, ok } from 'neverthrow';

import { Logger } from '../../src/logging/Logger';
import { MomoJob, momoError } from '../../src';
import { Job, ParsedIntervalSchedule, tryToJob } from '../../src/job/Job';
import { CronSchedule } from '../../src/job/MomoJob';

describe('tryToJob', () => {
  const logger: Logger = {
    debug: jest.fn(),
    error: jest.fn(),
  };

  beforeEach(async () => jest.clearAllMocks());

  describe('interval job', () => {
    it('validates a job with human readable interval', () => {
      const job = {
        name: 'test',
        schedule: { interval: '1 minute', firstRunAfter: 0 },
        handler: () => 'finished',
      };
      const expected: Job<ParsedIntervalSchedule> = {
        name: job.name,
        schedule: {
          interval: job.schedule.interval,
          parsedInterval: 60000,
          firstRunAfter: job.schedule.firstRunAfter,
          parsedFirstRunAfter: 0,
        },
        handler: job.handler,
        concurrency: 1,
        maxRunning: 0,
      };
      expect(tryToJob(job)).toEqual(ok(expected));
    });

    it('validates a job with number interval', () => {
      const job = {
        name: 'test',
        schedule: { interval: 42, firstRunAfter: 0 },
        handler: () => 'finished',
      };
      const expected: Job<ParsedIntervalSchedule> = {
        name: job.name,
        schedule: {
          interval: job.schedule.interval,
          parsedInterval: 42,
          firstRunAfter: job.schedule.firstRunAfter,
          parsedFirstRunAfter: 0,
        },
        handler: job.handler,
        concurrency: 1,
        maxRunning: 0,
      };
      expect(tryToJob(job)).toEqual(ok(expected));
    });

    it('reports error when interval cannot be parsed', () => {
      const job: MomoJob = {
        name: 'test',
        schedule: { interval: 'not an interval', firstRunAfter: 0 },
        handler: () => 'finished',
      };
      expect(tryToJob(job)).toEqual(err(momoError.nonParsableInterval));
    });

    it('reports error when human readable interval is not positive', () => {
      const job: MomoJob = {
        name: 'test',
        schedule: { interval: '-1 minute', firstRunAfter: 0 },
        handler: () => 'finished',
      };
      expect(tryToJob(job)).toEqual(err(momoError.invalidInterval));
    });

    it('reports error when interval is not positive', () => {
      const job: MomoJob = {
        name: 'test',
        schedule: { interval: -42, firstRunAfter: 0 },
        handler: () => 'finished',
      };
      expect(tryToJob(job)).toEqual(err(momoError.invalidInterval));
    });

    it('reports error when firstRunAfter is invalid', async () => {
      const job: MomoJob = {
        name: 'test',
        schedule: { interval: '1 minute', firstRunAfter: -1 },
        handler: () => 'finished',
      };
      expect(tryToJob(job)).toEqual(err(momoError.invalidFirstRunAfter));
    });

    it('reports error when firstRunAfter cannot be parsed', async () => {
      const job: MomoJob = {
        name: 'test',
        schedule: { interval: '1 minute', firstRunAfter: 'not parseable' },
        handler: () => 'finished',
      };
      expect(tryToJob(job)).toEqual(err(momoError.nonParsableFirstRunAfter));
    });

    it('reports error when firstRunAfter is parseable but invalid', async () => {
      const job: MomoJob = {
        name: 'test',
        schedule: { interval: '1 minute', firstRunAfter: '-1 minute' },
        handler: () => 'finished',
      };
      expect(tryToJob(job)).toEqual(err(momoError.invalidFirstRunAfter));
    });
  });

  describe('cron job', () => {
    it('validates a job', () => {
      const job: MomoJob = {
        name: 'test',
        schedule: { cronSchedule: '0 9 * * 1-5' },
        handler: () => 'finished',
      };
      const expected: Job<CronSchedule> = {
        name: job.name,
        schedule: { cronSchedule: job.schedule.cronSchedule },
        handler: job.handler,
        concurrency: 1,
        maxRunning: 0,
      };
      expect(tryToJob(job)).toEqual(ok(expected));
    });

    it('reports error when cron schedule cannot be parsed', () => {
      const job: MomoJob = {
        name: 'test',
        schedule: { cronSchedule: 'not a schedule' },
        handler: () => 'finished',
      };
      expect(tryToJob(job)).toEqual(err(momoError.nonParsableCronSchedule));
    });
  });

  it('reports error when maxRunning is invalid', async () => {
    const job: MomoJob = {
      name: 'test',
      schedule: { interval: '1 minute', firstRunAfter: 0 },
      handler: () => 'finished',
      maxRunning: -1,
    };
    expect(tryToJob(job)).toEqual(err(momoError.invalidMaxRunning));
  });

  it('reports error when concurrency is invalid', async () => {
    const job: MomoJob = {
      name: 'test',
      schedule: { interval: '1 minute', firstRunAfter: 0 },
      handler: () => 'finished',
      concurrency: 0,
    };
    expect(tryToJob(job)).toEqual(err(momoError.invalidConcurrency));
  });

  it('reports error when concurrency > maxRunning', async () => {
    const job: MomoJob = {
      name: 'test',
      schedule: { interval: '1 minute', firstRunAfter: 0 },
      handler: () => 'finished',
      concurrency: 3,
      maxRunning: 2,
    };
    expect(tryToJob(job)).toEqual(err(momoError.invalidConcurrency));
  });
});
