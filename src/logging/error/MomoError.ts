export const momoError = {
  nonParsableInterval: new Error('non-parsable job interval'),
  nonParsableCronSchedule: new Error('non-parsable cron schedule'),
  invalidConcurrency: new Error('concurrency must be at least 1'),
  invalidMaxRunning: new Error('maxRunning must be at least 0'),
  jobNotFound: new Error('job not found in database'),
  invalidFirstRunAfter: new Error('firstRunAfter must be at least 0'),
};
