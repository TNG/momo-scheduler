import { DateTime } from 'luxon';
import { max } from 'lodash';

import humanInterval from 'human-interval';
import { JobEntity } from '../repository/JobEntity';
import { momoError } from '../logging/error/MomoError';

export function calculateDelay(millisecondsInterval: number, job: JobEntity): number {
  const nextStart = calculateNextStart(millisecondsInterval, job);
  if (nextStart === undefined) {
    const firstRunAfter = typeof job.firstRunAfter === 'number' ? job.firstRunAfter : humanInterval(job.firstRunAfter);
    if (firstRunAfter === undefined || isNaN(firstRunAfter)) {
      // firstRunAfter was already validated when the job was defined
      throw momoError.invalidFirstRunAfter;
    }

    return firstRunAfter;
  }

  return max([nextStart - DateTime.now().toMillis(), 0]) ?? 0;
}

function calculateNextStart(interval: number, job: JobEntity): number | undefined {
  const lastStarted = job.executionInfo?.lastStarted;
  const lastStartedDateTime = lastStarted !== undefined ? DateTime.fromISO(lastStarted) : undefined;
  return lastStartedDateTime?.plus({ milliseconds: interval }).toMillis();
}
