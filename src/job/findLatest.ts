import { DateTime } from 'luxon';
import { JobEntity } from '../repository/JobEntity';

function compareLastFinished(left: JobEntity, right: JobEntity): JobEntity {
  const r = right.executionInfo?.lastFinished;
  if (!r) return left;
  const l = left.executionInfo?.lastFinished;
  if (!l) return right;
  return DateTime.fromISO(r).toMillis() > DateTime.fromISO(l).toMillis() ? right : left;
}

export function findLatest(jobs: JobEntity[]): JobEntity | undefined {
  if (jobs.length === 0) return undefined;
  return jobs.reduce(compareLastFinished);
}
