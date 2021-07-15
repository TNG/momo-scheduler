import { deepEqual, verify } from 'ts-mockito';

import { pingInterval, SchedulePing } from '../../src/schedule/SchedulePing';
import { ExecutionsRepository } from '../../src/repository/ExecutionsRepository';
import { sleep } from '../utils/sleep';
import { mockRepositories } from '../utils/mockRepositories';

describe('SchedulePing', () => {
  const scheduleId = '123';
  const executionPing = new SchedulePing(scheduleId, { debug: jest.fn(), error: jest.fn() });
  let executionsRepository: ExecutionsRepository;

  beforeAll(() => (executionsRepository = mockRepositories().executionsRepository));

  it('starts, pings, cleans and stops', async () => {
    executionPing.start();
    await sleep(pingInterval);

    verify(executionsRepository.ping(scheduleId)).once();
    verify(executionsRepository.clean()).once();

    await executionPing.stop();
    await sleep(pingInterval);

    verify(executionsRepository.ping(scheduleId)).once();
    verify(executionsRepository.delete(deepEqual({ scheduleId: scheduleId }))).once();
  });
});
