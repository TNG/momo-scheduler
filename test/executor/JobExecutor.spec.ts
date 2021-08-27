import { anything, capture, verify, when } from 'ts-mockito';

import { ExecutionStatus, MomoErrorType } from '../../src';
import { ExecutionsRepository } from '../../src/repository/ExecutionsRepository';
import { Job } from '../../src/job/Job';
import { JobEntity } from '../../src/repository/JobEntity';
import { JobExecutor } from '../../src/executor/JobExecutor';
import { JobRepository } from '../../src/repository/JobRepository';
import { loggerForTests } from '../utils/logging';
import { mockRepositories } from '../utils/mockRepositories';

describe('JobExecutor', () => {
  const scheduleId = '123';
  const handler = jest.fn();
  const job: Job = {
    name: 'test',
    interval: '1 minute',
    immediate: false,
    concurrency: 1,
    maxRunning: 0,
    handler,
  };
  const savedJob = JobEntity.from(job);

  const errorFn = jest.fn();
  let jobRepository: JobRepository;
  let executionsRepository: ExecutionsRepository;
  let jobExecutor: JobExecutor;

  beforeEach(() => {
    jest.clearAllMocks();

    const repositories = mockRepositories();
    jobRepository = repositories.jobRepository;
    executionsRepository = repositories.executionsRepository;
    when(executionsRepository.addExecution(scheduleId, job.name, job.maxRunning)).thenResolve({
      added: true,
      running: 0,
    });

    jobExecutor = new JobExecutor(job.handler, scheduleId, loggerForTests(errorFn));
  });

  it('executes job', async () => {
    await jobExecutor.execute(savedJob);

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

    await jobExecutor.execute(savedJob);

    expect(errorFn).not.toHaveBeenCalled();
    expect(job.handler).not.toHaveBeenCalled();

    verify(executionsRepository.addExecution(scheduleId, job.name, job.maxRunning)).once();
  });

  it('reports job error', async () => {
    const error = new Error('something bad happened');
    handler.mockImplementation(() => {
      throw error;
    });

    await jobExecutor.execute(savedJob);

    expect(errorFn).toHaveBeenCalledWith('job failed', MomoErrorType.executeJob, { name: job.name }, error);

    verify(executionsRepository.addExecution(scheduleId, job.name, job.maxRunning)).once();
    verify(executionsRepository.removeExecution(scheduleId, job.name)).once();
  });

  it('writes result to mongo', async () => {
    const handlerResult = 'the job result';
    handler.mockImplementation(() => {
      return handlerResult;
    });

    await jobExecutor.execute(savedJob);

    verify(jobRepository.updateJob(job.name, anything())).once();
    const [, update] = capture(jobRepository.updateJob).last();
    expect(update.executionInfo?.lastResult).toEqual({ status: ExecutionStatus.finished, handlerResult });

    verify(executionsRepository.addExecution(scheduleId, job.name, job.maxRunning)).once();
    verify(executionsRepository.removeExecution(scheduleId, job.name)).once();
  });
});
