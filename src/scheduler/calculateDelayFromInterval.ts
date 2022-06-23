import { DateTime } from 'luxon';
import { max } from 'lodash';

import { JobEntity } from '../repository/JobEntity';

export function calculateDelayFromInterval(millisecondsInterval: number, job: JobEntity): number {
  const nextStart = calculateNextStartFromInterval(millisecondsInterval, job);
  if (nextStart === undefined) {
    return job.firstRunAfter;
  }

  return max([nextStart - DateTime.now().toMillis(), 0]) ?? 0;
}

function calculateNextStartFromInterval(interval: number, job: JobEntity): number | undefined {
  const lastStarted = job.executionInfo?.lastStarted;
  const lastStartedDateTime = lastStarted !== undefined ? DateTime.fromISO(lastStarted) : undefined;
  return lastStartedDateTime?.plus({ milliseconds: interval }).toMillis();
}
