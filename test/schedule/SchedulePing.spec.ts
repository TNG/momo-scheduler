import { anyNumber, instance, mock, verify, when } from 'ts-mockito';

import { ScheduleState, SchedulesRepository } from '../../src/repository/SchedulesRepository';
import { SchedulePing } from '../../src/schedule/SchedulePing';
import { sleep } from '../utils/sleep';

describe('SchedulePing', () => {
  const interval = 1000;
  let error: jest.Mock;

  let schedulesRepository: SchedulesRepository;
  let schedulePing: SchedulePing;
  let startAllJobs: jest.Mock;

  beforeEach(() => {
    startAllJobs = jest.fn();
    schedulesRepository = mock(SchedulesRepository);
    error = jest.fn();
    schedulePing = new SchedulePing(instance(schedulesRepository), { debug: jest.fn(), error }, interval, startAllJobs);
  });

  afterEach(async () => schedulePing.stop());

  it('starts, pings, cleans and stops', async () => {
    when(schedulesRepository.getScheduleState(anyNumber())).thenResolve(ScheduleState.thisInstanceActive);
    await schedulePing.start();

    expect(startAllJobs).toHaveBeenCalledTimes(1);
    verify(schedulesRepository.ping()).once();

    await sleep(1.1 * interval);
    expect(startAllJobs).toHaveBeenCalledTimes(1);
    verify(schedulesRepository.ping()).twice();

    await schedulePing.stop();
    await sleep(interval);

    verify(schedulesRepository.ping()).twice();
    verify(schedulesRepository.deleteOne()).once();
  });

  it('handles mongo errors', async () => {
    when(schedulesRepository.getScheduleState(anyNumber())).thenResolve(ScheduleState.thisInstanceActive);
    const message = 'I am an error that should be caught';
    when(schedulesRepository.ping()).thenReject({
      message,
    } as Error);

    await schedulePing.start();

    verify(schedulesRepository.ping()).once();
    expect(error).toHaveBeenCalledWith(
      'Pinging or cleaning the Schedules repository failed',
      'an internal error occurred',
      {},
      { message },
    );
  });

  it('handles job start taking longer than interval', async () => {
    when(schedulesRepository.getScheduleState(anyNumber())).thenResolve(ScheduleState.differentInstanceActive);

    startAllJobs.mockImplementation(async () => sleep(2 * interval));

    await schedulePing.start();

    verify(schedulesRepository.ping()).never();
    expect(startAllJobs).toHaveBeenCalledTimes(0);

    when(schedulesRepository.getScheduleState(anyNumber())).thenResolve(ScheduleState.thisInstanceActive);

    await sleep(1.1 * interval);
    verify(schedulesRepository.ping()).once();
    expect(startAllJobs).toHaveBeenCalledTimes(1);

    await sleep(1.1 * interval);
    verify(schedulesRepository.ping()).twice();
    expect(startAllJobs).toHaveBeenCalledTimes(1);

    await schedulePing.stop();
    await sleep(interval);
    verify(schedulesRepository.ping()).twice();
    expect(startAllJobs).toHaveBeenCalledTimes(1);
    verify(schedulesRepository.deleteOne()).once();
  });
});
