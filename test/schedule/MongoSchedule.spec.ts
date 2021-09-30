import { anyString, capture, deepEqual, instance, mock, verify } from 'ts-mockito';

import { ExecutionsRepository } from '../../src/repository/ExecutionsRepository';
import { JobRepository } from '../../src/repository/JobRepository';
import { MomoOptions, MongoSchedule } from '../../src';

const executionsRepository = mock(ExecutionsRepository);
jest.mock('../../src/Connection', () => {
  return {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    Connection: {
      create: async (_options: MomoOptions) => {
        return {
          getJobRepository: () => instance(mock(JobRepository)),
          getExecutionsRepository: () => instance(executionsRepository),
          disconnect: async () => undefined,
        };
      },
    },
  };
});

describe('MongoSchedule', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
  });

  it('connects and starts the ping and disconnects and stops the ping', async () => {
    const mongoSchedule = await MongoSchedule.connect({ url: 'mongodb://does.not/matter' });

    verify(executionsRepository.addSchedule(anyString())).once();
    const [scheduleId] = capture(executionsRepository.addSchedule).last();

    await mongoSchedule.disconnect();

    verify(executionsRepository.deleteOne(deepEqual({ scheduleId })));
  });
});
