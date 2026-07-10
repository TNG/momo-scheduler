import { beforeEach, describe, expect, it, vi } from 'vitest';
import { type DeepMockProxy, mockDeep } from 'vitest-mock-extended';
import { JobExecutor } from '../../src/executor/JobExecutor.js';
import { ExecutionStatus, MomoErrorType } from '../../src/index.js';
import type { Job, ParsedIntervalSchedule } from '../../src/job/Job.js';
import type { JobRepository } from '../../src/repository/JobRepository.js';
import type { SchedulesRepository } from '../../src/repository/SchedulesRepository.js';
import { loggerForTests } from '../utils/logging.js';

describe('JobExecutor', () => {
  const errorFn = vi.fn();
  const handler = vi.fn();
  const job: Job<ParsedIntervalSchedule> = {
    name: 'test',
    schedule: {
      interval: '1 minute',
      parsedInterval: 60_000,
      firstRunAfter: 0,
      parsedFirstRunAfter: 0,
    },
    concurrency: 1,
    maxRunning: 0,
    handler,
  };

  let jobRepositoryMock: DeepMockProxy<JobRepository>;
  let schedulesRepositoryMock: DeepMockProxy<SchedulesRepository>;
  let jobExecutor: JobExecutor;

  beforeEach(() => {
    vi.clearAllMocks();

    jobRepositoryMock = mockDeep<JobRepository>();
    schedulesRepositoryMock = mockDeep<SchedulesRepository>();

    schedulesRepositoryMock.addExecution
      .calledWith(job.name, job.maxRunning)
      .mockResolvedValue({
        added: true,
        running: 0,
      });

    jobExecutor = new JobExecutor(
      job.handler,
      schedulesRepositoryMock,
      jobRepositoryMock,
      loggerForTests(errorFn),
    );
  });

  it('executes job with parameters and writes result to mongo', async () => {
    const jobParameters = { foo: 'bar' };

    await jobExecutor.execute(job, jobParameters);

    expect(job.handler).toHaveBeenCalledWith(jobParameters);

    expect(jobRepositoryMock.updateJob).toHaveBeenCalledTimes(1);
    expect(jobRepositoryMock.updateJob).toHaveBeenCalledWith(
      job.name,
      expect.anything(),
    );
    const onlyCall = jobRepositoryMock.updateJob.mock.calls[0];
    const update = onlyCall?.[1];
    expect(update?.executionInfo?.lastResult).toEqual({
      status: ExecutionStatus.finished,
      handlerResult: 'finished',
    });

    expect(schedulesRepositoryMock.addExecution).toHaveBeenCalledTimes(1);
    expect(schedulesRepositoryMock.removeExecution).toHaveBeenCalledTimes(1);
  });

  it('does not execute job when mongo entity could not be updated', async () => {
    schedulesRepositoryMock.addExecution
      .calledWith(job.name, job.maxRunning)
      .mockResolvedValue({
        added: false,
        running: 0,
      });

    await jobExecutor.execute(job);

    expect(errorFn).not.toHaveBeenCalled();
    expect(job.handler).not.toHaveBeenCalled();

    expect(schedulesRepositoryMock.addExecution).toHaveBeenCalledTimes(1);
    expect(schedulesRepositoryMock.addExecution).toHaveBeenCalledWith(
      job.name,
      job.maxRunning,
    );
  });

  it('reports job error', async () => {
    const error = new Error('something bad happened');
    handler.mockImplementation(() => {
      throw error;
    });

    await jobExecutor.execute(job);

    expect(errorFn).toHaveBeenCalledWith(
      'job failed',
      MomoErrorType.executeJob,
      { name: job.name },
      error,
    );

    expect(schedulesRepositoryMock.addExecution).toHaveBeenCalledTimes(1);
    expect(schedulesRepositoryMock.removeExecution).toHaveBeenCalledTimes(1);
  });

  it('reports undefined job error', async () => {
    const error = {} as Error;
    handler.mockImplementation(() => {
      throw error;
    });

    await jobExecutor.execute(job);

    expect(errorFn).toHaveBeenCalledWith(
      'job failed',
      MomoErrorType.executeJob,
      { name: job.name },
      error,
    );

    expect(schedulesRepositoryMock.addExecution).toHaveBeenCalledTimes(1);
    expect(schedulesRepositoryMock.removeExecution).toHaveBeenCalledTimes(1);
  });
});
