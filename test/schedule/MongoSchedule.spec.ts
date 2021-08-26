import { anyString, capture, deepEqual, instance, mock, verify } from 'ts-mockito';

import { MongoSchedule } from '../../src';
import { ExecutionsRepository } from '../../src/repository/ExecutionsRepository';
import { JobRepository } from '../../src/repository/JobRepository';
import { connectForTest } from '../../src/connect';
import { MongoClient } from 'mongodb';

let jobRepository: JobRepository;
let executionsRepository: ExecutionsRepository;
jest.mock('../../src/repository/getRepository', () => {
  return {
    getJobRepository: () => instance(jobRepository),
    getExecutionsRepository: () => instance(executionsRepository),
  };
});

describe('MongoSchedule', () => {
  beforeEach(async () => {
    jest.clearAllMocks();

    connectForTest(instance(mock(MongoClient)));
    jobRepository = mock(JobRepository);
    executionsRepository = mock(ExecutionsRepository);
  });

  it('connects and starts the ping and disconnects and stops the ping', async () => {
    const mongoSchedule = await MongoSchedule.connect({ url: 'mongodb://does.not/matter' });

    verify(executionsRepository.addSchedule(anyString())).once();
    const [scheduleId] = capture(executionsRepository.addSchedule).last();

    await mongoSchedule.disconnect();

    verify(executionsRepository.deleteOne(deepEqual({ scheduleId })));
  });
});
