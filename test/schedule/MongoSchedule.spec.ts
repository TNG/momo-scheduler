import { instance, mock, verify, when } from 'ts-mockito';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SchedulesRepository } from '../../src/repository/SchedulesRepository';
import { JobRepository } from '../../src/repository/JobRepository';
import { MomoOptions, MongoSchedule } from '../../src';

const schedulesRepository = mock(SchedulesRepository);
const disconnect = vi.fn();
vi.mock('../../src/Connection', () => {
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
    vi.clearAllMocks();
  });

  it('connects and starts the ping and disconnects and stops the ping', async () => {
    when(schedulesRepository.setActiveSchedule()).thenResolve(true);

    const mongoSchedule = await MongoSchedule.connect({ scheduleName: 'schedule', url: 'mongodb://does.not/matter' });
    const secondSchedule = await MongoSchedule.connect({
      scheduleName: 'secondSchedule',
      url: 'mongodb://does.not/matter',
    });

    await mongoSchedule.start();
    verify(schedulesRepository.setActiveSchedule()).once();
    await secondSchedule.start();
    verify(schedulesRepository.setActiveSchedule()).twice();

    await mongoSchedule.disconnect();
    await secondSchedule.disconnect();
    verify(schedulesRepository.deleteOne()).twice();

    expect(disconnect).toHaveBeenCalledTimes(2);
  });
});
