import { anyString, deepEqual, instance, mock, when } from 'ts-mockito';

import { ObjectId } from 'mongodb';
import { ExecutionStatus, MomoEvent, MomoJob, MomoOptions, MongoSchedule } from '../../src';
import { ExecutionsRepository } from '../../src/repository/ExecutionsRepository';
import { JobRepository } from '../../src/repository/JobRepository';
import { initLoggingForTests } from '../utils/logging';
import { toJob, toJobDefinition } from '../../src/job/Job';

const executionsRepository = mock(ExecutionsRepository);
const jobRepository = mock(JobRepository);
jest.mock('../../src/Connection', () => {
  return {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    Connection: {
      create: async (_options: MomoOptions) => {
        return {
          getJobRepository: () => instance(jobRepository),
          getExecutionsRepository: () => instance(executionsRepository),
          disconnect: async () => undefined,
        };
      },
    },
  };
});

describe('Schedule', () => {
  const momoJob: MomoJob = {
    name: 'test job',
    schedule: { interval: 'one minute', firstRunAfter: 0 },
    handler: jest.fn(),
  };
  const entityWithId = { _id: new ObjectId(), ...toJobDefinition(toJob(momoJob)) };

  let mongoSchedule: MongoSchedule;

  beforeEach(async () => {
    jest.clearAllMocks();

    when(jobRepository.find(deepEqual({ name: momoJob.name }))).thenResolve([]);

    mongoSchedule = await MongoSchedule.connect({ url: 'mongodb://does.not/matter' });
    initLoggingForTests(mongoSchedule);
  });

  afterEach(async () => {
    await mongoSchedule.disconnect();
  });

  it('emits logs', async () => {
    let caughtEvent: MomoEvent | undefined;
    mongoSchedule.on('debug', (event: MomoEvent) => (caughtEvent = event));

    await mongoSchedule.start();

    expect(caughtEvent).toEqual({ message: 'start all jobs', data: { count: 0 } });
  });

  it('does not report error when concurrency > maxRunning but maxRunning is not set', async () => {
    const defined = await mongoSchedule.define({ ...momoJob, concurrency: 3 });

    expect(defined).toBe(true);
  });

  it('counts jobs', async () => {
    await mongoSchedule.define(momoJob);

    expect(mongoSchedule.count()).toBe(1);
  });

  it('counts started jobs', async () => {
    const name = 'not started';
    when(jobRepository.find(deepEqual({ name }))).thenResolve([]);

    const notStartedJob = { ...momoJob, name };
    await mongoSchedule.define(notStartedJob);
    await mongoSchedule.define(momoJob);

    when(jobRepository.findOne(deepEqual({ name: momoJob.name }))).thenResolve(entityWithId);

    await mongoSchedule.startJob(momoJob.name);

    expect(mongoSchedule.count()).toBe(2);
    expect(mongoSchedule.count(true)).toBe(1);
  });

  it('does nothing if a job is started that is not on the schedule', async () => {
    await mongoSchedule.startJob('not defined');

    expect(mongoSchedule.count()).toBe(0);
    expect(mongoSchedule.count(true)).toBe(0);
  });

  it('runs a job once', async () => {
    await mongoSchedule.define(momoJob);

    when(jobRepository.findOne(deepEqual({ name: momoJob.name }))).thenResolve(entityWithId);
    when(executionsRepository.addExecution(anyString(), momoJob.name, 0)).thenResolve({ added: true, running: 0 });

    const result = await mongoSchedule.run(momoJob.name);

    expect(result).toEqual({ status: ExecutionStatus.finished, handlerResult: 'finished' });
    expect(momoJob.handler).toHaveBeenCalledTimes(1);
  });

  it('runs a job once after delay', async () => {
    await mongoSchedule.define(momoJob);

    when(jobRepository.findOne(deepEqual({ name: momoJob.name }))).thenResolve(entityWithId);
    when(executionsRepository.addExecution(anyString(), momoJob.name, 0)).thenResolve({ added: true, running: 0 });

    const result = await mongoSchedule.run(momoJob.name, 500);

    expect(result).toEqual({ status: ExecutionStatus.finished, handlerResult: 'finished' });
    expect(momoJob.handler).toHaveBeenCalledTimes(1);
  });

  it('skips running job once when job is not found', async () => {
    const result = await mongoSchedule.run('not defined');

    expect(result).toEqual({ status: ExecutionStatus.notFound });
  });

  it('skips running job once when job is not found in repository', async () => {
    await mongoSchedule.define(momoJob);

    when(jobRepository.findOne(deepEqual({ name: momoJob.name }))).thenResolve(undefined);

    const result = await mongoSchedule.run(momoJob.name);

    expect(result).toEqual({ status: ExecutionStatus.notFound });
  });

  it('skips running job once when maxRunning is reached', async () => {
    await mongoSchedule.define(momoJob);

    when(jobRepository.findOne(deepEqual({ name: momoJob.name }))).thenResolve(entityWithId);
    when(executionsRepository.addExecution(anyString(), momoJob.name, 0)).thenResolve({
      added: false,
      running: 0,
    });

    const result = await mongoSchedule.run(momoJob.name);

    expect(result).toEqual({ status: ExecutionStatus.maxRunningReached });
    expect(momoJob.handler).toHaveBeenCalledTimes(0);
  });
});
