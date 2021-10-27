import { deepEqual, instance, mock, verify, when } from 'ts-mockito';

import { ExecutionsRepository } from '../../src/repository/ExecutionsRepository';
import { SchedulePing } from '../../src/schedule/SchedulePing';
import { sleep } from '../utils/sleep';

describe('SchedulePing', () => {
  const scheduleId = '123';
  const interval = 1000;

  let executionsRepository: ExecutionsRepository;
  let schedulePing: SchedulePing;

  beforeAll(() => {
    executionsRepository = mock(ExecutionsRepository);
    schedulePing = new SchedulePing(
      scheduleId,
      instance(executionsRepository),
      { debug: jest.fn(), error: jest.fn() },
      interval
    );
  });

  beforeEach(jest.clearAllMocks);

  it('starts, pings, cleans and stops', async () => {
    schedulePing.start();
    await sleep(interval);

    verify(executionsRepository.ping(scheduleId)).once();
    verify(executionsRepository.clean()).once();

    await schedulePing.stop();
    await sleep(interval);

    verify(executionsRepository.ping(scheduleId)).once();
    verify(executionsRepository.deleteOne(deepEqual({ scheduleId }))).once();
  });

  it('handles mongo errors', async () => {
    try {
      when(executionsRepository.ping(scheduleId)).thenReject({ message: 'I am dead' } as Error);

      schedulePing.start();
      await sleep(interval);

      verify(executionsRepository.ping(scheduleId)).once();
    } finally {
      await schedulePing.stop();
    }
  });
});
