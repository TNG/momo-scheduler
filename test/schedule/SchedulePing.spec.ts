import { deepEqual, verify } from 'ts-mockito';

import { pingInterval, SchedulePing } from '../../src/schedule/SchedulePing';
import { ExecutionRepository } from '../../src/repository/ExecutionRepository';
import { sleep } from '../utils/sleep';
import { mockRepositories } from '../utils/mockRepositories';

describe('SchedulePing', () => {
  const scheduleId = '123';
  const executionPing = new SchedulePing(scheduleId, { debug: jest.fn(), error: jest.fn() });
  let executionRepository: ExecutionRepository;

  beforeAll(() => (executionRepository = mockRepositories().executionRepository));

  it('starts and stops', async () => {
    executionPing.start();
    await sleep(pingInterval);

    verify(executionRepository.ping(scheduleId)).once();

    await executionPing.stop();
    await sleep(pingInterval);

    verify(executionRepository.ping(scheduleId)).once();
    verify(executionRepository.delete(deepEqual({ scheduleId: scheduleId }))).once();
  });
});
