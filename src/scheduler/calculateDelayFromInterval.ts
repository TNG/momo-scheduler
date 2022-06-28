import { DateTime } from 'luxon';
import { max, toInteger } from 'lodash';
import humanInterval from 'human-interval';
import { IntervalSchedule } from '../job/MomoJob';

export function calculateDelayFromInterval(schedule: IntervalSchedule, jobLastStarted: string | undefined): number {
  const nextStart = calculateNextStartFromInterval(toInteger(humanInterval(schedule.interval)), jobLastStarted);
  if (nextStart === undefined) {
    return schedule.firstRunAfter;
  }

  return max([nextStart - DateTime.now().toMillis(), 0]) ?? 0;
}

function calculateNextStartFromInterval(interval: number, jobLastStarted: string | undefined): number | undefined {
  const lastStartedDateTime = jobLastStarted !== undefined ? DateTime.fromISO(jobLastStarted) : undefined;
  return lastStartedDateTime?.plus({ milliseconds: interval }).toMillis();
}
