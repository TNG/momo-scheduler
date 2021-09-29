import { DateTime } from 'luxon';
import { max } from 'lodash';

import { JobEntity } from '../repository/JobEntity';

export function calculateDelay(millisecondsInterval: number, job: JobEntity): number {
  const nextStart = calculateNextStart(millisecondsInterval, job);
  if (nextStart === undefined) {
    return job.delay ?? millisecondsInterval;
  }

  return max([nextStart - DateTime.now().toMillis(), 0]) ?? 0;
}

function calculateNextStart(interval: number, job: JobEntity): number | undefined {
  const lastStarted = job.executionInfo?.lastStarted;
  const lastStartedDateTime = lastStarted !== undefined ? DateTime.fromISO(lastStarted) : undefined;
  return lastStartedDateTime?.plus({ milliseconds: interval }).toMillis();
}
