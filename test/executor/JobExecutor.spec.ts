import { anything, capture, instance, mock, verify, when } from 'ts-mockito';

import { JobExecutor } from '../../src/executor/JobExecutor';
import { ExecutionPing } from '../../src/executor/ExecutionPing';
import { JobEntity } from '../../src/repository/JobEntity';
import { JobRepository } from '../../src/repository/JobRepository';
import { ExecutionRepository } from '../../src/repository/ExecutionRepository';
import { Job } from '../../src/job/Job';
import { ExecutionStatus, MomoErrorType } from '../../src';
import { mockRepositories } from '../utils/mockRepositories';
import { loggerForTests } from '../utils/logging';

describe('JobExecutor', () => {
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
  let executionRepository: ExecutionRepository;
  let executionPing: ExecutionPing;
  let jobExecutor: JobExecutor;

  beforeEach(() => {
    jest.clearAllMocks();

    const repositories = mockRepositories();
    jobRepository = repositories.jobRepository;
    executionRepository = repositories.executionRepository;
    executionPing = mock(ExecutionPing);
    when(executionRepository.add(job.name, job.maxRunning)).thenResolve(instance(executionPing));

    jobExecutor = new JobExecutor(job.handler, loggerForTests(errorFn));
  });

  it('executes job', async () => {
    await jobExecutor.execute(savedJob);

    expect(job.handler).toHaveBeenCalled();

    verify(jobRepository.updateJob(job.name, anything())).once();
    const [, update] = capture(jobRepository.updateJob).last();
    expect(update.executionInfo?.lastResult).toEqual({ status: ExecutionStatus.finished });

    verify(executionRepository.add(job.name, job.maxRunning)).once();
    verify(executionPing.stop()).once();
  });

  it('does not execute job when mongo entity could not be updated', async () => {
    when(executionRepository.add(job.name, job.maxRunning)).thenResolve(undefined);

    await jobExecutor.execute(savedJob);

    expect(errorFn).not.toHaveBeenCalled();
    expect(job.handler).not.toHaveBeenCalled();

    verify(executionRepository.add(job.name, job.maxRunning)).once();
  });

  it('reports job error', async () => {
    const error = new Error('something bad happened');
    handler.mockImplementation(() => {
      throw error;
    });

    await jobExecutor.execute(savedJob);

    expect(errorFn).toHaveBeenCalledWith('job failed', MomoErrorType.executeJob, { name: job.name }, error);

    verify(executionRepository.add(job.name, job.maxRunning)).once();
    verify(executionPing.stop()).once();
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

    verify(executionRepository.add(job.name, job.maxRunning)).once();
    verify(executionPing.stop()).once();
  });
});
