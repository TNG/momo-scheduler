import { ObjectId, WithId } from 'mongodb';
import { deepEqual, instance, mock, when } from 'ts-mockito';

import { loggerForTests } from '../utils/logging';
import { sleep } from '../utils/sleep';
import { waitFor } from '../utils/waitFor';
import { Job, toJobDefinition } from '../../src/job/Job';
import { JobScheduler } from '../../src/scheduler/JobScheduler';
import { JobExecutor } from '../../src/executor/JobExecutor';
import { SchedulesRepository } from '../../src/repository/SchedulesRepository';
import { JobRepository } from '../../src/repository/JobRepository';
import { JobEntity } from '../../src/repository/JobEntity';
import { MomoErrorType } from '../../src';

describe('JobScheduler', () => {
  let jobHandler: jest.Mock;
  let errorFn: jest.Mock;

  let job: Job;

  let schedulesRepository: SchedulesRepository;
  let jobRepository: JobRepository;
  let jobScheduler: JobScheduler;

  beforeEach(() => {
    schedulesRepository = mock(SchedulesRepository);
    jobRepository = mock(JobRepository);

    jobHandler = jest.fn();
    errorFn = jest.fn();

    job = {
      name: 'interval job',
      schedule: { interval: 200, parsedInterval: 200, firstRunAfter: 0, parsedFirstRunAfter: 0 },
      timeout: 800,
      concurrency: 1,
      maxRunning: 0,
      handler: jobHandler,
    };

    const jobEntity: WithId<JobEntity> = {
      ...toJobDefinition(job),
      _id: new ObjectId(),
    };
    when(jobRepository.findOne(deepEqual({ name: job.name }))).thenResolve(jobEntity);
    when(schedulesRepository.addExecution(job.name, job.maxRunning)).thenResolve({ added: true, running: 1 });

    const jobExecutor = new JobExecutor(
      job.handler,
      instance(schedulesRepository),
      instance(jobRepository),
      loggerForTests(errorFn),
    );
    jobScheduler = new JobScheduler(
      job.name,
      jobExecutor,
      instance(schedulesRepository),
      instance(jobRepository),
      loggerForTests(errorFn),
    );
  });

  afterEach(async () => {
    await jobScheduler.stop();
  });

  it('stops failing job and restarts after timeout', async () => {
    const error = new Error('boom');
    when(schedulesRepository.removeExecution(job.name)).thenReject(error).thenResolve();

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
    expect(errorFn).toHaveBeenCalledWith('timeout reached, restarting job now', MomoErrorType.executeJob, {
      name: job.name,
    });
  });

  it('cancels restart timeout when stopping job', async () => {
    const error = new Error('boom');
    when(schedulesRepository.removeExecution(job.name)).thenReject(error);

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
