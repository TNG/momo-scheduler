import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ExecutionStatus, MomoErrorType } from '../../src/index.js';
import { JobExecutor } from '../../src/executor/JobExecutor.js';
import type { Job, ParsedIntervalSchedule } from '../../src/job/Job.js';
import { JobRepository } from '../../src/repository/JobRepository.js';
import { SchedulesRepository } from '../../src/repository/SchedulesRepository.js';
import { createMock } from '../utils/createMock.js';
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

  let jobRepositoryMock: ReturnType<typeof createMock<JobRepository>>;
  let schedulesRepositoryMock: ReturnType<typeof createMock<SchedulesRepository>>;
  let jobExecutor: JobExecutor;

  beforeEach(() => {
    vi.clearAllMocks();

    jobRepositoryMock = createMock<JobRepository>();
    schedulesRepositoryMock = createMock<SchedulesRepository>();

    schedulesRepositoryMock.stubs.addExecution.mockResolvedValue({
      added: true,
      running: 0,
    });

    jobExecutor = new JobExecutor(
      job.handler,
      schedulesRepositoryMock.instance,
      jobRepositoryMock.instance,
      loggerForTests(errorFn),
    );
  });

  it('executes job with parameters and writes result to mongo', async () => {
    const jobParameters = { foo: 'bar' };

    await jobExecutor.execute(job, jobParameters);

    expect(job.handler).toHaveBeenCalledWith(jobParameters);

    expect(jobRepositoryMock.stubs.updateJob).toHaveBeenCalledTimes(1);
    expect(jobRepositoryMock.stubs.updateJob).toHaveBeenCalledWith(
      job.name,
      expect.anything(),
    );
    const lastCall = jobRepositoryMock.stubs.updateJob.mock.calls[0] ?? [];
    const update = lastCall[1];
    expect(update.executionInfo?.lastResult).toEqual({
      status: ExecutionStatus.finished,
      handlerResult: 'finished',
    });

    expect(schedulesRepositoryMock.stubs.addExecution).toHaveBeenCalledTimes(1);
    expect(schedulesRepositoryMock.stubs.removeExecution).toHaveBeenCalledTimes(1);
  });

  it('does not execute job when mongo entity could not be updated', async () => {
    schedulesRepositoryMock.stubs.addExecution.mockResolvedValue({
      added: false,
      running: 0,
    });

    await jobExecutor.execute(job);

    expect(errorFn).not.toHaveBeenCalled();
    expect(job.handler).not.toHaveBeenCalled();

    expect(schedulesRepositoryMock.stubs.addExecution).toHaveBeenCalledTimes(1);
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

    expect(schedulesRepositoryMock.stubs.addExecution).toHaveBeenCalledTimes(1);
    expect(schedulesRepositoryMock.stubs.removeExecution).toHaveBeenCalledTimes(1);
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

    expect(schedulesRepositoryMock.stubs.addExecution).toHaveBeenCalledTimes(1);
    expect(schedulesRepositoryMock.stubs.removeExecution).toHaveBeenCalledTimes(1);
  });
});
