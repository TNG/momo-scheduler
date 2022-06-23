export const momoError = {
  nonParsableInterval: new Error('non-parsable job interval'),
  missingIntervalAndCronSchedule: new Error('a job must have either an interval or a cron schedule'),
  invalidCronSchedule: new Error('the schedule must be a valid cron string'),
  conflictingIntervalAndCronSchedule: new Error('a job cannot have both an interval and a cron schedule'),
  invalidConcurrency: new Error('concurrency must be at least 1'),
  invalidMaxRunning: new Error('maxRunning must be at least 0'),
  jobNotFound: new Error('job not found in database'),
  invalidFirstRunAfter: new Error('firstRunAfter must be at least 0'),
};
