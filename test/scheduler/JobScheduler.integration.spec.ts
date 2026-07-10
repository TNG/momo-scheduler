import { ObjectId, type WithId } from 'mongodb';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  type Mock,
  vi,
} from 'vitest';
import { type DeepMockProxy, mockDeep } from 'vitest-mock-extended';
import { JobExecutor } from '../../src/executor/JobExecutor.js';
import { MomoErrorType } from '../../src/index.js';
import { type Job, toJobDefinition } from '../../src/job/Job.js';
import type { JobEntity } from '../../src/repository/JobEntity.js';
import type { JobRepository } from '../../src/repository/JobRepository.js';
import type { SchedulesRepository } from '../../src/repository/SchedulesRepository.js';
import { JobScheduler } from '../../src/scheduler/JobScheduler.js';
import { loggerForTests } from '../utils/logging.js';
import { matchObject } from '../utils/matchers.js';
import { sleep } from '../utils/sleep.js';
import { waitFor } from '../utils/waitFor.js';

describe('JobScheduler', () => {
  let jobHandler: Mock;
  let errorFn: Mock;

  let job: Job;

  let schedulesRepositoryMock: DeepMockProxy<SchedulesRepository>;
  let jobRepositoryMock: DeepMockProxy<JobRepository>;
  let jobScheduler: JobScheduler;

  beforeEach(() => {
    schedulesRepositoryMock = mockDeep<SchedulesRepository>();
    jobRepositoryMock = mockDeep<JobRepository>();

    jobHandler = vi.fn();
    errorFn = vi.fn();

    job = {
      name: 'interval job',
      schedule: {
        interval: 200,
        parsedInterval: 200,
        firstRunAfter: 0,
        parsedFirstRunAfter: 0,
      },
      timeout: 800,
      concurrency: 1,
      maxRunning: 0,
      handler: jobHandler,
    };

    const jobEntity: WithId<JobEntity> = {
      ...toJobDefinition(job),
      _id: new ObjectId(),
    };
    jobRepositoryMock.findOne
      .calledWith(matchObject({ name: job.name }))
      .mockResolvedValue(jobEntity);
    schedulesRepositoryMock.addExecution
      .calledWith(job.name, job.maxRunning)
      .mockResolvedValue({
        added: true,
        running: 1,
      });

    const jobExecutor = new JobExecutor(
      job.handler,
      schedulesRepositoryMock,
      jobRepositoryMock,
      loggerForTests(errorFn),
    );
    jobScheduler = new JobScheduler(
      job.name,
      jobExecutor,
      schedulesRepositoryMock,
      jobRepositoryMock,
      loggerForTests(errorFn),
    );
  });

  afterEach(async () => {
    await jobScheduler.stop();
  });

  it('stops failing job and restarts after timeout', async () => {
    const error = new Error('boom');
    schedulesRepositoryMock.removeExecution
      .calledWith(job.name)
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce(undefined);

    await jobScheduler.start();

    // the mongo error is reported and the job is stopped (only executed once)
    await waitFor(() => expect(jobHandler).toHaveBeenCalledTimes(1), 500);
    expect(errorFn).toHaveBeenCalledWith(
      `an unexpected error occurred while executing job; stopping current job and scheduling restart after configured timout=${job.timeout} ms`,
      MomoErrorType.executeJob,
      { name: job.name },
      error,
    );

    // the job is restarted after timeout
    await waitFor(() => expect(jobHandler).toHaveBeenCalledTimes(2), 1000);
    expect(errorFn).toHaveBeenCalledWith(
      'timeout reached, restarting job now',
      MomoErrorType.executeJob,
      {
        name: job.name,
      },
    );
  });

  it('cancels restart timeout when stopping job', async () => {
    const error = new Error('boom');
    schedulesRepositoryMock.removeExecution
      .calledWith(job.name)
      .mockRejectedValue(error);

    await jobScheduler.start();

    // the mongo error is reported
    await waitFor(() => expect(jobHandler).toHaveBeenCalledTimes(1), 300);
    expect(errorFn).toHaveBeenCalledWith(
      `an unexpected error occurred while executing job; stopping current job and scheduling restart after configured timout=${job.timeout} ms`,
      MomoErrorType.executeJob,
      { name: job.name },
      error,
    );

    await jobScheduler.stop();

    // the restart timeout is cancelled and the job is not restarted
    await sleep(1000);
    expect(jobHandler).toHaveBeenCalledTimes(1);
  });
});
