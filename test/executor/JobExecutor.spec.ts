import { anything, capture, instance, mock, verify, when } from 'ts-mockito';

import { ExecutionStatus, MomoErrorType } from '../../src';
import { ExecutionsRepository } from '../../src/repository/ExecutionsRepository';
import { JobExecutor } from '../../src/executor/JobExecutor';
import { JobRepository } from '../../src/repository/JobRepository';
import { loggerForTests } from '../utils/logging';
import { Job } from '../../src/job/Job';

describe('JobExecutor', () => {
  const scheduleId = '123';
  const errorFn = jest.fn();
  const handler = jest.fn();
  const job: Job = {
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

  let jobRepository: JobRepository;
  let executionsRepository: ExecutionsRepository;
  let jobExecutor: JobExecutor;

  beforeEach(() => {
    jest.clearAllMocks();

    jobRepository = mock(JobRepository);
    executionsRepository = mock(ExecutionsRepository);

    when(executionsRepository.addExecution(scheduleId, job.name, job.maxRunning)).thenResolve({
      added: true,
      running: 0,
    });

    jobExecutor = new JobExecutor(
      job.handler,
      scheduleId,
      instance(executionsRepository),
      instance(jobRepository),
      loggerForTests(errorFn)
    );
  });

  it('executes job', async () => {
    await jobExecutor.execute(job);

    expect(job.handler).toHaveBeenCalled();

    verify(jobRepository.updateJob(job.name, anything())).once();
    const [, update] = capture(jobRepository.updateJob).last();
    expect(update.executionInfo?.lastResult).toEqual({ status: ExecutionStatus.finished, handlerResult: 'finished' });

    verify(executionsRepository.addExecution(scheduleId, job.name, job.maxRunning)).once();
    verify(executionsRepository.removeExecution(scheduleId, job.name)).once();
  });

  it('does not execute job when mongo entity could not be updated', async () => {
    when(executionsRepository.addExecution(scheduleId, job.name, job.maxRunning)).thenResolve({
      added: false,
      running: 0,
    });

    await jobExecutor.execute(job);

    expect(errorFn).not.toHaveBeenCalled();
    expect(job.handler).not.toHaveBeenCalled();

    verify(executionsRepository.addExecution(scheduleId, job.name, job.maxRunning)).once();
  });

  it('reports job error', async () => {
    const error = new Error('something bad happened');
    handler.mockImplementation(() => {
      throw error;
    });

    await jobExecutor.execute(job);

    expect(errorFn).toHaveBeenCalledWith('job failed', MomoErrorType.executeJob, { name: job.name }, error);

    verify(executionsRepository.addExecution(scheduleId, job.name, job.maxRunning)).once();
    verify(executionsRepository.removeExecution(scheduleId, job.name)).once();
  });

  it('writes result to mongo', async () => {
    const handlerResult = 'the job result';
    handler.mockImplementation(() => {
      return handlerResult;
    });

    await jobExecutor.execute(job);

    verify(jobRepository.updateJob(job.name, anything())).once();
    const [, update] = capture(jobRepository.updateJob).last();
    expect(update.executionInfo?.lastResult).toEqual({ status: ExecutionStatus.finished, handlerResult });

    verify(executionsRepository.addExecution(scheduleId, job.name, job.maxRunning)).once();
    verify(executionsRepository.removeExecution(scheduleId, job.name)).once();
  });
});
