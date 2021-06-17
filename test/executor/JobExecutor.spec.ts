import { anything, capture, verify, when } from 'ts-mockito';
import { JobExecutor } from '../../src/executor/JobExecutor';
import { JobEntity } from '../../src/repository/JobEntity';
import { JobRepository } from '../../src/repository/JobRepository';
import { Job } from '../../src/job/Job';
import { ExecutionStatus, MomoErrorType } from '../../src';
import { mockJobRepository } from '../utils/mockJobRepository';
import { loggerForTests } from '../utils/logging';

describe('JobExecutor', () => {
  const job: Job = {
    name: 'test',
    interval: '1 minute',
    immediate: false,
    concurrency: 1,
    maxRunning: 0,
    handler: jest.fn(),
  };
  const savedJob = JobEntity.from(job);

  const errorFn = jest.fn();
  let jobRepository: JobRepository;
  let jobExecutor: JobExecutor;

  beforeEach(() => {
    jest.clearAllMocks();

    jobRepository = mockJobRepository();
    when(jobRepository.incrementRunning(job.name, job.maxRunning)).thenResolve(true);

    jobExecutor = new JobExecutor(job, loggerForTests(errorFn));
  });

  it('executes job', async () => {
    await jobExecutor.execute(savedJob);

    expect(job.handler).toHaveBeenCalled();

    verify(jobRepository.updateJob(job.name, anything())).once();
    const [, update] = capture(jobRepository.updateJob).last();
    expect(update.executionInfo?.lastResult).toEqual({ status: ExecutionStatus.finished });

    verify(jobRepository.incrementRunning(job.name, job.maxRunning)).once();
    verify(jobRepository.decrementRunning(job.name)).once();
  });

  it('does not execute job when mongo entity could not be updated', async () => {
    when(jobRepository.incrementRunning(job.name, job.maxRunning)).thenResolve(false);

    await jobExecutor.execute(savedJob);

    expect(errorFn).not.toHaveBeenCalled();
    expect(job.handler).not.toHaveBeenCalled();

    verify(jobRepository.incrementRunning(job.name, job.maxRunning)).once();
    verify(jobRepository.decrementRunning(job.name)).never();
  });

  it('reports job error', async () => {
    const error = new Error('something bad happened');
    job.handler = () => {
      throw error;
    };

    await jobExecutor.execute(savedJob);

    expect(errorFn).toHaveBeenCalledWith('job failed', MomoErrorType.executeJob, { name: job.name }, error);

    verify(jobRepository.incrementRunning(job.name, job.maxRunning)).once();
    verify(jobRepository.decrementRunning(job.name)).once();
  });

  it('writes result to mongo', async () => {
    const handlerResult = 'the job result';
    job.handler = () => {
      return handlerResult;
    };

    await jobExecutor.execute(savedJob);

    verify(jobRepository.updateJob(job.name, anything())).once();
    const [, update] = capture(jobRepository.updateJob).last();
    expect(update.executionInfo?.lastResult).toEqual({ status: ExecutionStatus.finished, handlerResult });

    verify(jobRepository.incrementRunning(job.name, job.maxRunning)).once();
    verify(jobRepository.decrementRunning(job.name)).once();
  });
});
