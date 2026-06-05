import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockDeep } from 'vitest-mock-extended';

import { type MomoOptions, MongoSchedule } from '../../src/index.js';
import type { JobRepository } from '../../src/repository/JobRepository.js';
import type { SchedulesRepository } from '../../src/repository/SchedulesRepository.js';

const schedulesRepositoryMock = mockDeep<SchedulesRepository>();
const jobRepositoryMock = mockDeep<JobRepository>();
const disconnect = vi.fn();
vi.mock('../../src/Connection', () => {
  return {
    Connection: {
      create: async (_options: MomoOptions) => {
        return {
          getJobRepository: () => jobRepositoryMock,
          getSchedulesRepository: () => schedulesRepositoryMock,
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
    schedulesRepositoryMock.setActiveSchedule.mockResolvedValue(true);

    const mongoSchedule = await MongoSchedule.connect({
      scheduleName: 'schedule',
      url: 'mongodb://does.not/matter',
    });
    const secondSchedule = await MongoSchedule.connect({
      scheduleName: 'secondSchedule',
      url: 'mongodb://does.not/matter',
    });

    await mongoSchedule.start();
    expect(schedulesRepositoryMock.setActiveSchedule).toHaveBeenCalledTimes(1);
    await secondSchedule.start();
    expect(schedulesRepositoryMock.setActiveSchedule).toHaveBeenCalledTimes(2);

    await mongoSchedule.disconnect();
    await secondSchedule.disconnect();
    expect(schedulesRepositoryMock.deleteOne).toHaveBeenCalledTimes(2);

    expect(disconnect).toHaveBeenCalledTimes(2);
  });
});
