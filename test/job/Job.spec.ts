import { err, ok } from 'neverthrow';

import {
  Job,
  ParsedIntervalSchedule,
  maxJobTimeout,
  maxNodeTimeoutDelay,
  tryToCronJob,
  tryToIntervalJob,
  tryToJob,
} from '../../src/job/Job';
import { MomoJob, momoError } from '../../src';
import { CronSchedule } from '../../src/job/MomoJob';

describe('Job', () => {
  describe('tryToJob', () => {
    describe('interval job', () => {
      it('validates a job with human readable interval', () => {
        const job = {
          name: 'test',
          schedule: { interval: '1 minute', firstRunAfter: 0 },
          handler: () => 'finished',
          parameters: { foo: 'bar' },
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
          parameters: { foo: 'bar' },
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

      it('reports error when timeout is too large', () => {
        const job: MomoJob = {
          name: 'test',
          schedule: { interval: '1 day', firstRunAfter: 0 },
          timeout: maxJobTimeout + 1,
          handler: () => 'finished',
        };
        expect(tryToJob(job)).toEqual(err(momoError.invalidTimeout));
      });

      it('reports error when timeout is less than 1', () => {
        const job: MomoJob = {
          name: 'test',
          schedule: { interval: '1 day', firstRunAfter: 0 },
          timeout: 0.5,
          handler: () => 'finished',
        };
        expect(tryToJob(job)).toEqual(err(momoError.invalidTimeout));
      });

      it('reports error when human readable interval is too large', () => {
        const job: MomoJob = {
          name: 'test',
          schedule: { interval: '25 days', firstRunAfter: 0 },
          handler: () => 'finished',
        };
        expect(tryToJob(job)).toEqual(err(momoError.invalidInterval));
      });

      it('reports error when interval is too large', () => {
        const job: MomoJob = {
          name: 'test',
          schedule: { interval: maxNodeTimeoutDelay + 1, firstRunAfter: 0 },
          handler: () => 'finished',
        };
        expect(tryToJob(job)).toEqual(err(momoError.invalidInterval));
      });

      it('reports error when firstRunAfter is negative', async () => {
        const job: MomoJob = {
          name: 'test',
          schedule: { interval: '1 minute', firstRunAfter: -1 },
          handler: () => 'finished',
        };
        expect(tryToJob(job)).toEqual(err(momoError.invalidFirstRunAfter));
      });

      it('reports error when firstRunAfter is too large', async () => {
        const job: MomoJob = {
          name: 'test',
          schedule: { interval: '1 minute', firstRunAfter: maxNodeTimeoutDelay + 1 },
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

      it('reports error when firstRunAfter is parseable but negative', async () => {
        const job: MomoJob = {
          name: 'test',
          schedule: { interval: '1 minute', firstRunAfter: '-1 minute' },
          handler: () => 'finished',
        };
        expect(tryToJob(job)).toEqual(err(momoError.invalidFirstRunAfter));
      });

      it('reports error when firstRunAfter is parseable but too large', async () => {
        const job: MomoJob = {
          name: 'test',
          schedule: { interval: '1 minute', firstRunAfter: '25 days' },
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

  describe('tryToCronJob', () => {
    it('sets defaults', () => {
      const job: MomoJob = {
        name: 'test',
        schedule: { cronSchedule: '0 9 * * 1-5' },
        handler: () => undefined,
      };

      expect(tryToCronJob(job)).toEqual(
        ok({
          ...job,
          schedule: { cronSchedule: '0 9 * * 1-5' },
          concurrency: 1,
          maxRunning: 0,
        }),
      );
    });
  });

  describe('tryToIntervalJob', () => {
    it('sets defaults', () => {
      const job: MomoJob = {
        name: 'test',
        schedule: { interval: '1 second' },
        handler: () => undefined,
      };

      expect(tryToIntervalJob(job)).toEqual(
        ok({
          ...job,
          schedule: { interval: '1 second', parsedInterval: 1000, firstRunAfter: 0, parsedFirstRunAfter: 0 },
          concurrency: 1,
          maxRunning: 0,
        }),
      );
    });

    it('parses firstRunAfter', () => {
      const job: MomoJob = {
        name: 'test',
        schedule: { interval: '1 second', firstRunAfter: '5 minutes' },
        handler: () => undefined,
      };

      expect(tryToIntervalJob(job)).toEqual(
        ok({
          ...job,
          schedule: {
            interval: '1 second',
            parsedInterval: 1000,
            firstRunAfter: '5 minutes',
            parsedFirstRunAfter: 300000,
          },
          concurrency: 1,
          maxRunning: 0,
        }),
      );
    });

    it('keeps firstRunAfter as number', () => {
      const job: MomoJob = {
        name: 'test',
        schedule: { interval: '1 second', firstRunAfter: 42 },
        handler: () => undefined,
      };

      expect(tryToIntervalJob(job)).toEqual(
        ok({
          ...job,
          schedule: { interval: '1 second', parsedInterval: 1000, firstRunAfter: 42, parsedFirstRunAfter: 42 },
          concurrency: 1,
          maxRunning: 0,
        }),
      );
    });
  });
});
