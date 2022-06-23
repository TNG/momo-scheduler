import { Cron } from 'cron-schedule';
import { DateTime } from 'luxon';

export function calculateDelayFromCronSchedule(cronSchedule: Cron): number {
  return cronSchedule.getNextDate().getTime() - DateTime.now().toMillis();
}
