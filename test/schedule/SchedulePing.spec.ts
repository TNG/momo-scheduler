import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  type Mock,
  vi,
} from 'vitest';
import { type DeepMockProxy, mockDeep } from 'vitest-mock-extended';

import { MomoErrorType } from '../../src/index.js';
import type { SchedulesRepository } from '../../src/repository/SchedulesRepository.js';
import { SchedulePing } from '../../src/schedule/SchedulePing.js';
import { sleep } from '../utils/sleep.js';

describe('SchedulePing', () => {
  const interval = 1000;
  const logData = { name: 'name', scheduleId: 'scheduleId' };
  let error: Mock;

  let schedulesRepositoryMock: DeepMockProxy<SchedulesRepository>;
  let schedulePing: SchedulePing;
  let startAllJobs: Mock;

  beforeEach(() => {
    startAllJobs = vi.fn();
    schedulesRepositoryMock = mockDeep<SchedulesRepository>();
    error = vi.fn();
    schedulePing = new SchedulePing(
      schedulesRepositoryMock,
      { debug: vi.fn(), error },
      interval,
      startAllJobs,
    );
  });

  afterEach(async () => schedulePing.stop());

  it('starts, pings, cleans and stops', async () => {
    schedulesRepositoryMock.setActiveSchedule.mockResolvedValue(true);
    await schedulePing.start();

    expect(startAllJobs).toHaveBeenCalledTimes(1);
    expect(schedulesRepositoryMock.setActiveSchedule).toHaveBeenCalledTimes(1);

    await sleep(1.1 * interval);
    expect(startAllJobs).toHaveBeenCalledTimes(1);
    expect(schedulesRepositoryMock.setActiveSchedule).toHaveBeenCalledTimes(2);

    await schedulePing.stop();
    await sleep(interval);

    expect(schedulesRepositoryMock.setActiveSchedule).toHaveBeenCalledTimes(2);
    expect(schedulesRepositoryMock.deleteOne).toHaveBeenCalledTimes(1);
  });

  it('handles mongo errors', async () => {
    schedulesRepositoryMock.getLogData.mockReturnValue(logData);
    const message = 'I am an error that should be caught';
    schedulesRepositoryMock.setActiveSchedule.mockRejectedValue({
      message,
    } as Error);

    await schedulePing.start();

    expect(schedulesRepositoryMock.setActiveSchedule).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledWith(
      'Pinging or cleaning the Schedules repository failed',
      MomoErrorType.internal,
      logData,
      { message },
    );
  });

  it('retries failed pings if configured', async () => {
    const schedulePingWithRetries = new SchedulePing(
      schedulesRepositoryMock,
      { debug: vi.fn(), error },
      10,
      startAllJobs,
      3,
      1,
    );

    try {
      schedulesRepositoryMock.getLogData.mockReturnValue(logData);
      const message = 'I am an error that should lead to a retry';
      schedulesRepositoryMock.setActiveSchedule.mockRejectedValue({
        message,
      } as Error);

      await schedulePingWithRetries.start();

      expect(schedulesRepositoryMock.setActiveSchedule).toHaveBeenCalledTimes(
        3,
      );
      expect(error).toHaveBeenCalledWith(
        'Pinging or cleaning the Schedules repository failed',
        MomoErrorType.internal,
        logData,
        { message },
      );
    } finally {
      await schedulePingWithRetries.stop();
    }
  });

  it('does not start any jobs for inactive schedule', async () => {
    await schedulePing.start();

    expect(startAllJobs).not.toHaveBeenCalled();
  });

  it('does not start any jobs if setting active schedule fails', async () => {
    schedulesRepositoryMock.setActiveSchedule.mockResolvedValue(false);

    await schedulePing.start();

    expect(startAllJobs).not.toHaveBeenCalled();
  });

  it('becomes active when other schedule dies', async () => {
    await schedulePing.start();

    expect(startAllJobs).toHaveBeenCalledTimes(0);

    // other schedule dies, this one becomes active
    schedulesRepositoryMock.setActiveSchedule.mockResolvedValue(true);

    await sleep(1.1 * interval);
    expect(startAllJobs).toHaveBeenCalledTimes(1);
  });

  it('handles job start taking longer than interval', async () => {
    startAllJobs.mockImplementation(async () => sleep(2 * interval));
    schedulesRepositoryMock.setActiveSchedule.mockResolvedValue(true);

    await schedulePing.start();
    expect(startAllJobs).toHaveBeenCalledTimes(1);

    await sleep(1.1 * interval);
    expect(startAllJobs).toHaveBeenCalledTimes(1);

    await schedulePing.stop();

    await sleep(interval);
    expect(startAllJobs).toHaveBeenCalledTimes(1);
    expect(schedulesRepositoryMock.deleteOne).toHaveBeenCalledTimes(1);
  });
});
