import { JobEntity } from '../repository/JobEntity';
import { DateTime } from 'luxon';
import { max } from 'lodash';

export function calculateDelay(interval: number, immediate: boolean, job: JobEntity): number {
  const nextStart = calculateNextStart(interval, job);
  if (!nextStart) {
    return immediate ? 0 : interval;
  }

  return max([nextStart - DateTime.now().toMillis(), 0]) ?? 0;
}

function calculateNextStart(interval: number, job: JobEntity): number | undefined {
  const lastStarted = job.executionInfo?.lastStarted;
  const lastStartedDateTime = lastStarted ? DateTime.fromISO(lastStarted) : undefined;
  return lastStartedDateTime?.plus(interval).toMillis();
}
