import { DateTime } from 'luxon';

import { JobEntity } from '../repository/JobEntity';

function compareLastFinished<JobParams, T extends JobEntity<JobParams>>(left: T, right: T): T {
  const r = right.executionInfo?.lastFinished;
  if (r === undefined) return left;
  const l = left.executionInfo?.lastFinished;
  if (l === undefined) return right;
  return DateTime.fromISO(r).toMillis() > DateTime.fromISO(l).toMillis() ? right : left;
}

export function findLatest<JobParams, T extends JobEntity<JobParams>>(jobs: T[]): T | undefined {
  if (jobs.length === 0) return undefined;
  return jobs.reduce(compareLastFinished);
}
