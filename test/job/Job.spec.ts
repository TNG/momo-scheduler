import { tryToCronJob, tryToIntervalJob } from '../../src/job/Job';
import { MomoJob } from '../../src';

describe('Job', () => {
  describe('toCronJob', () => {
    it('sets defaults', () => {
      const job: MomoJob = {
        name: 'test',
        schedule: { cronSchedule: '0 9 * * 1-5' },
        handler: () => undefined,
      };

      expect(tryToCronJob(job)).toEqual({
        ...job,
        schedule: { cronSchedule: '0 9 * * 1-5' },
        concurrency: 1,
        maxRunning: 0,
      });
    });
  });

  describe('toIntervalJob', () => {
    it('sets defaults', () => {
      const job: MomoJob = {
        name: 'test',
        schedule: { interval: '1 second' },
        handler: () => undefined,
      };

      expect(tryToIntervalJob(job)).toEqual({
        ...job,
        schedule: { interval: '1 second', parsedInterval: 1000, firstRunAfter: 0, parsedFirstRunAfter: 0 },
        concurrency: 1,
        maxRunning: 0,
      });
    });

    it('parses firstRunAfter', () => {
      const job: MomoJob = {
        name: 'test',
        schedule: { interval: '1 second', firstRunAfter: '5 minutes' },
        handler: () => undefined,
      };

      expect(tryToIntervalJob(job)).toEqual({
        ...job,
        schedule: {
          interval: '1 second',
          parsedInterval: 1000,
          firstRunAfter: '5 minutes',
          parsedFirstRunAfter: 300000,
        },
        concurrency: 1,
        maxRunning: 0,
      });
    });

    it('keeps firstRunAfter as number', () => {
      const job: MomoJob = {
        name: 'test',
        schedule: { interval: '1 second', firstRunAfter: 42 },
        handler: () => undefined,
      };

      expect(tryToIntervalJob(job)).toEqual({
        ...job,
        schedule: { interval: '1 second', parsedInterval: 1000, firstRunAfter: 42, parsedFirstRunAfter: 42 },
        concurrency: 1,
        maxRunning: 0,
      });
    });
  });
});
