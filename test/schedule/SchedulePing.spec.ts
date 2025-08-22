import { instance, mock, verify, when } from 'ts-mockito';
import { Mock, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SchedulesRepository } from '../../src/repository/SchedulesRepository';
import { SchedulePing } from '../../src/schedule/SchedulePing';
import { sleep } from '../utils/sleep';

describe('SchedulePing', () => {
  const interval = 1000;
  const logData = { name: 'name', scheduleId: 'scheduleId' };
  let error: Mock;

  let schedulesRepository: SchedulesRepository;
  let schedulePing: SchedulePing;
  let startAllJobs: Mock;

  beforeEach(() => {
    startAllJobs = vi.fn();
    schedulesRepository = mock(SchedulesRepository);
    error = vi.fn();
    schedulePing = new SchedulePing(instance(schedulesRepository), { debug: vi.fn(), error }, interval, startAllJobs);
  });

  afterEach(async () => schedulePing.stop());

  it('starts, pings, cleans and stops', async () => {
    when(schedulesRepository.setActiveSchedule()).thenResolve(true);
    await schedulePing.start();

    expect(startAllJobs).toHaveBeenCalledTimes(1);
    verify(schedulesRepository.setActiveSchedule()).once();

    await sleep(1.1 * interval);
    expect(startAllJobs).toHaveBeenCalledTimes(1);
    verify(schedulesRepository.setActiveSchedule()).twice();

    await schedulePing.stop();
    await sleep(interval);

    verify(schedulesRepository.setActiveSchedule()).twice();
    verify(schedulesRepository.deleteOne()).once();
  });

  it('handles mongo errors', async () => {
    when(schedulesRepository.getLogData()).thenReturn(logData);
    const message = 'I am an error that should be caught';
    when(schedulesRepository.setActiveSchedule()).thenReject({
      message,
    } as Error);

    await schedulePing.start();

    verify(schedulesRepository.setActiveSchedule()).once();
    expect(error).toHaveBeenCalledWith(
      'Pinging or cleaning the Schedules repository failed',
      'an internal error occurred',
      logData,
      { message },
    );
  });

  it('does not start any jobs for inactive schedule', async () => {
    await schedulePing.start();

    expect(startAllJobs).not.toHaveBeenCalled();
  });

  it('does not start any jobs if setting active schedule fails', async () => {
    when(schedulesRepository.setActiveSchedule()).thenResolve(false);

    await schedulePing.start();

    expect(startAllJobs).not.toHaveBeenCalled();
  });

  it('becomes active when other schedule dies', async () => {
    await schedulePing.start();

    expect(startAllJobs).toHaveBeenCalledTimes(0);

    // other schedule dies, this one becomes active
    when(schedulesRepository.setActiveSchedule()).thenResolve(true);

    await sleep(1.1 * interval);
    expect(startAllJobs).toHaveBeenCalledTimes(1);
  });

  it('handles job start taking longer than interval', async () => {
    startAllJobs.mockImplementation(async () => sleep(2 * interval));
    when(schedulesRepository.setActiveSchedule()).thenResolve(true);

    await schedulePing.start();
    expect(startAllJobs).toHaveBeenCalledTimes(1);

    await sleep(1.1 * interval);
    expect(startAllJobs).toHaveBeenCalledTimes(1);

    await schedulePing.stop();

    await sleep(interval);
    expect(startAllJobs).toHaveBeenCalledTimes(1);
    verify(schedulesRepository.deleteOne()).once();
  });
});
