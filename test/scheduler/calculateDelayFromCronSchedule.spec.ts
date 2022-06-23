import { Clock, install } from '@sinonjs/fake-timers';
import { parseCronExpression } from 'cron-schedule';
import { calculateDelayFromCronSchedule } from '../../src/scheduler/calculateDelayFromCronSchedule';

describe('calculateDelayFromCronSchedule', () => {
  const clock: Clock = install();
  const validCronSchedule = parseCronExpression('* * * * *');

  afterAll(() => clock.reset());

  it('calculates delay based on the cron schedule', () => {
    clock.tick(500);

    const delay = calculateDelayFromCronSchedule(validCronSchedule);
    expect(delay).toBe(59500);
  });
});
