import { anyString, capture, deepEqual, verify } from 'ts-mockito';

import { ExecutionsRepository } from '../../src/repository/ExecutionsRepository';
import { MongoSchedule } from '../../src';
import { mockRepositories } from '../utils/mockRepositories';

describe('MongoSchedule', () => {
  let executionsRepository: ExecutionsRepository;

  beforeEach(async () => {
    jest.clearAllMocks();

    executionsRepository = mockRepositories().executionsRepository;
  });

  it('connects and starts the ping and disconnects and stops the ping', async () => {
    const mongoSchedule = await MongoSchedule.connect({ url: 'mongodb://does.not/matter' });

    verify(executionsRepository.addSchedule(anyString())).once();
    const [scheduleId] = capture(executionsRepository.addSchedule).last();

    await mongoSchedule.disconnect();

    verify(executionsRepository.delete(deepEqual({ scheduleId })));
  });
});
