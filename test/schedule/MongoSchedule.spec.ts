import { anyString, deepEqual, instance, mock, verify } from 'ts-mockito';

import { SchedulesRepository } from '../../src/repository/SchedulesRepository';
import { JobRepository } from '../../src/repository/JobRepository';
import { MomoOptions, MongoSchedule } from '../../src';

const schedulesRepository = mock(SchedulesRepository);
const disconnect = jest.fn();
jest.mock('../../src/Connection', () => {
  return {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    Connection: {
      create: async (_options: MomoOptions) => {
        return {
          getJobRepository: () => instance(mock(JobRepository)),
          getSchedulesRepository: () => instance(schedulesRepository),
          disconnect,
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
    verify(schedulesRepository.createIndex()).once();

    await mongoSchedule.start();
    verify(schedulesRepository.isActiveSchedule()).once();

    await mongoSchedule.disconnect();
    verify(schedulesRepository.deleteOne(deepEqual({ scheduleId: anyString() }))).once();

    expect(disconnect).toHaveBeenCalledTimes(1);
  });
});
