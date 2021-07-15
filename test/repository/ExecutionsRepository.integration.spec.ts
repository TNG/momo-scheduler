import { MongoMemoryServer } from 'mongodb-memory-server';

import { connect, disconnect } from '../../src/connect';
import { ExecutionsRepository } from '../../src/repository/ExecutionsRepository';
import { getExecutionsRepository } from '../../src/repository/getRepository';
import { sleep } from '../utils/sleep';

describe('ExecutionsRepository', () => {
  const scheduleId = '123';
  const name = 'test job';

  let mongo: MongoMemoryServer;
  let executionsRepository: ExecutionsRepository;

  beforeAll(async () => {
    ExecutionsRepository.deadScheduleThreshold = 1000;

    mongo = await MongoMemoryServer.create();
    await connect({ url: await mongo.getUri() });
    executionsRepository = getExecutionsRepository();
  });

  beforeEach(async () => await executionsRepository.clear());

  afterAll(async () => {
    await disconnect();
    await mongo.stop();
  });

  describe('addSchedule', () => {
    it('can add a schedule', async () => {
      await executionsRepository.addSchedule(scheduleId);

      const entities = await executionsRepository.find({});

      expect(entities).toHaveLength(1);
      expect(entities[0].scheduleId).toEqual(scheduleId);
    });
  });

  describe('with schedule', () => {
    beforeEach(async () => {
      await executionsRepository.addSchedule(scheduleId);
    });

    describe('job', () => {
      it('can add and remove a job', async () => {
        await executionsRepository.addJob(scheduleId, name);

        const executionsEntity = await executionsRepository.findOne({ scheduleId });
        expect(executionsEntity?.executions).toEqual({ [name]: 0 });

        await executionsRepository.removeJob(scheduleId, name);
        const executionsEntity2 = await executionsRepository.findOne({ scheduleId });
        expect(executionsEntity2?.executions).toEqual({});
      });
    });

    describe('execution', () => {
      it('can add and remove an execution', async () => {
        const { added, running } = await executionsRepository.addExecution(scheduleId, name, 1);
        expect(added).toBe(true);
        expect(running).toBe(0);

        const executionsEntity = await executionsRepository.findOne({ scheduleId });
        expect(executionsEntity?.executions).toEqual({ [name]: 1 });

        await executionsRepository.removeExecution(scheduleId, name);

        const executionsEntity2 = await executionsRepository.findOne({ scheduleId });
        expect(executionsEntity2?.executions).toEqual({ [name]: 0 });
      });

      it('can add an execution when only dead schedule reports executions', async () => {
        const deadScheduleId = 'dead schedule';
        await executionsRepository.addSchedule(deadScheduleId);
        await executionsRepository.addExecution(deadScheduleId, name, 1);
        await sleep(ExecutionsRepository.deadScheduleThreshold);

        const { added, running } = await executionsRepository.addExecution(scheduleId, name, 1);
        expect(added).toBe(true);
        expect(running).toBe(0);
      });

      it('cannot add an execution when maxRunning is reached', async () => {
        await executionsRepository.addExecution(scheduleId, name, 1);
        const { added, running } = await executionsRepository.addExecution(scheduleId, name, 1);
        expect(added).toBe(false);
        expect(running).toBe(1);
      });

      it('can add an execution with maxRunning set to 0', async () => {
        const executionPing = await executionsRepository.addExecution(scheduleId, name, 0);
        expect(executionPing).toBeDefined();
      });
    });

    describe('countRunningExecutions', () => {
      it('returns number of executions', async () => {
        await executionsRepository.addExecution(scheduleId, name, 2);
        await executionsRepository.addExecution(scheduleId, name, 2);

        const running = await executionsRepository.countRunningExecutions(name);
        expect(running).toBe(2);
      });

      it('does not count dead executions', async () => {
        await executionsRepository.addExecution(scheduleId, name, 1);
        await sleep(ExecutionsRepository.deadScheduleThreshold);

        const running = await executionsRepository.countRunningExecutions(name);
        expect(running).toBe(0);
      });
    });

    describe('ping', () => {
      it('updates timestamp', async () => {
        const executionsEntity = await executionsRepository.findOne({ scheduleId });

        await executionsRepository.ping(scheduleId);

        const executionsEntityAfterPing = await executionsRepository.findOne({ scheduleId });
        expect(executionsEntityAfterPing?.timestamp).toBeGreaterThan(executionsEntity!.timestamp);
      });
    });
  });

  describe('clean', () => {
    const deadScheduleId = 'dead schedule';

    it('removes dead schedules', async () => {
      await executionsRepository.addSchedule(deadScheduleId);
      await sleep(ExecutionsRepository.deadScheduleThreshold);

      const deletedCount = await executionsRepository.clean();

      expect(deletedCount).toBe(1);
      expect(await executionsRepository.findOne({ scheduleId })).toBeUndefined();
    });

    it('keeps alive schedules', async () => {
      await executionsRepository.addSchedule(deadScheduleId);
      await sleep(ExecutionsRepository.deadScheduleThreshold);

      await executionsRepository.addSchedule(scheduleId);

      const deletedCount = await executionsRepository.clean();

      expect(deletedCount).toBe(1);
      expect(await executionsRepository.findOne({ scheduleId: deadScheduleId })).toBeUndefined();
      expect(await executionsRepository.findOne({ scheduleId })).toBeDefined();
    });
  });
});
