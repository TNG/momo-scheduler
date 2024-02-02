import { anything, capture, instance, mock, verify, when } from 'ts-mockito';

import { ExecutionStatus, MomoErrorType } from '../../src';
import { SchedulesRepository } from '../../src/repository/SchedulesRepository';
import { JobExecutor } from '../../src/executor/JobExecutor';
import { JobRepository } from '../../src/repository/JobRepository';
import { loggerForTests } from '../utils/logging';
import { Job, ParsedIntervalSchedule } from '../../src/job/Job';

describe('JobExecutor', () => {
  const errorFn = jest.fn();
  const handler = jest.fn();
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

  let jobRepository: JobRepository;
  let schedulesRepository: SchedulesRepository;
  let jobExecutor: JobExecutor;

  beforeEach(() => {
    jest.clearAllMocks();

    jobRepository = mock(JobRepository);
    schedulesRepository = mock(SchedulesRepository);

    when(schedulesRepository.addExecution(job.name, job.maxRunning)).thenResolve({
      added: true,
      running: 0,
    });

    jobExecutor = new JobExecutor(
      job.handler,
      instance(schedulesRepository),
      instance(jobRepository),
      loggerForTests(errorFn),
    );
  });

  it('executes job with parameters and writes result to mongo', async () => {
    const jobParameters = { foo: 'bar' };

    await jobExecutor.execute(job, jobParameters);

    expect(job.handler).toHaveBeenCalledWith(jobParameters);

    verify(jobRepository.updateJob(job.name, anything())).once();
    const [, update] = capture(jobRepository.updateJob).last();
    expect(update.executionInfo?.lastResult).toEqual({ status: ExecutionStatus.finished, handlerResult: 'finished' });

    verify(schedulesRepository.addExecution(job.name, job.maxRunning)).once();
    verify(schedulesRepository.removeExecution(job.name)).once();
  });

  it('does not execute job when mongo entity could not be updated', async () => {
    when(schedulesRepository.addExecution(job.name, job.maxRunning)).thenResolve({
      added: false,
      running: 0,
    });

    await jobExecutor.execute(job);

    expect(errorFn).not.toHaveBeenCalled();
    expect(job.handler).not.toHaveBeenCalled();

    verify(schedulesRepository.addExecution(job.name, job.maxRunning)).once();
  });

  it('reports job error', async () => {
    const error = new Error('something bad happened');
    handler.mockImplementation(() => {
      throw error;
    });

    await jobExecutor.execute(job);

    expect(errorFn).toHaveBeenCalledWith('job failed', MomoErrorType.executeJob, { name: job.name }, error);

    verify(schedulesRepository.addExecution(job.name, job.maxRunning)).once();
    verify(schedulesRepository.removeExecution(job.name)).once();
  });

  it('reports undefined job error', async () => {
    const error = {} as Error;
    handler.mockImplementation(() => {
      throw error;
    });

    await jobExecutor.execute(job);

    expect(errorFn).toHaveBeenCalledWith('job failed', MomoErrorType.executeJob, { name: job.name }, error);

    verify(schedulesRepository.addExecution(job.name, job.maxRunning)).once();
    verify(schedulesRepository.removeExecution(job.name)).once();
  });
});
