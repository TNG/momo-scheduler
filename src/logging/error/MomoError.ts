export const momoError = {
  nonParsableInterval: new Error('non-parsable job interval'),
  invalidConcurrency: new Error('concurrency must be at least 1 but not greater than maxRunning'),
  invalidMaxRunning: new Error('maxRunning must be at least 0'),
  jobNotFound: new Error('job not found in database'),
  invalidFirstRunAfter: new Error('firstRunAfter must be at least 0'),
};
