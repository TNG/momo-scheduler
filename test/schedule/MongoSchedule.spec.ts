import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type MomoOptions, MongoSchedule } from '../../src';
import { JobRepository } from '../../src/repository/JobRepository';
import { SchedulesRepository } from '../../src/repository/SchedulesRepository';
import { createMock } from '../utils/createMock';

const schedulesRepositoryMock = createMock<SchedulesRepository>();
const disconnect = vi.fn();
vi.mock('../../src/Connection', () => {
  return {
    Connection: {
      create: async (_options: MomoOptions) => {
        return {
          getJobRepository: () => createMock<JobRepository>().instance,
          getSchedulesRepository: () => schedulesRepositoryMock.instance,
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
    schedulesRepositoryMock.stubs.setActiveSchedule.mockResolvedValue(true);

    const mongoSchedule = await MongoSchedule.connect({
      scheduleName: 'schedule',
      url: 'mongodb://does.not/matter',
    });
    const secondSchedule = await MongoSchedule.connect({
      scheduleName: 'secondSchedule',
      url: 'mongodb://does.not/matter',
    });

    await mongoSchedule.start();
    expect(schedulesRepositoryMock.stubs.setActiveSchedule).toHaveBeenCalledTimes(1);
    await secondSchedule.start();
    expect(schedulesRepositoryMock.stubs.setActiveSchedule).toHaveBeenCalledTimes(2);

    await mongoSchedule.disconnect();
    await secondSchedule.disconnect();
    expect(schedulesRepositoryMock.stubs.deleteOne).toHaveBeenCalledTimes(2);

    expect(disconnect).toHaveBeenCalledTimes(2);
  });
});
