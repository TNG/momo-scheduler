import { MongoMemoryServer } from 'mongodb-memory-server';

import { connect, disconnect } from '../../src/connect';
import { deadExecutionThreshold, ExecutionRepository } from '../../src/repository/ExecutionRepository';
import { getExecutionRepository } from '../../src/repository/getRepository';
import { sleep } from '../utils/sleep';

describe('ExecutionRepository', () => {
  const scheduleId = '123';
  const name = 'test job';

  let mongo: MongoMemoryServer;
  let executionRepository: ExecutionRepository;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await connect({ url: await mongo.getUri() });
    executionRepository = getExecutionRepository();
  });

  beforeEach(async () => await executionRepository.clear());

  afterAll(async () => {
    await disconnect();
    await mongo.stop();
  });

  describe('addSchedule', () => {
    it('can add a schedule', async () => {
      await executionRepository.addSchedule(scheduleId);

      const entities = await executionRepository.find({});

      expect(entities).toHaveLength(1);
      expect(entities[0].scheduleId).toEqual(scheduleId);
    });
  });

  describe('executions', () => {
    beforeEach(async () => {
      await executionRepository.addSchedule(scheduleId);
    });

    describe('addExecution', () => {
      it('can add an execution', async () => {
        const executionPing = await executionRepository.addExecution(scheduleId, name, 1);
        expect(executionPing).toBeDefined();
      });

      it('cannot add an execution when maxRunning is reached', async () => {
        await executionRepository.addExecution(scheduleId, name, 1);
        const { added, running } = await executionRepository.addExecution(scheduleId, name, 1);
        expect(added).toBe(false);
        expect(running).toBe(1);
      });

      it('can add an execution with maxRunning set to 0', async () => {
        const executionPing = await executionRepository.addExecution(scheduleId, name, 0);
        expect(executionPing).toBeDefined();
      });
    });

    describe('countRunningExecutions', () => {
      it('returns number of executions', async () => {
        await executionRepository.addExecution(scheduleId, name, 2);
        await executionRepository.addExecution(scheduleId, name, 2);

        const running = await executionRepository.countRunningExecutions(name);
        expect(running).toBe(2);
      });

      it('does not count dead executions', async () => {
        await executionRepository.addExecution(scheduleId, name, 1);
        await sleep(deadExecutionThreshold);

        const running = await executionRepository.countRunningExecutions(name);
        expect(running).toBe(0);
      });
    });

    describe('ping', () => {
      it('updates timestamp', async () => {
        const entity = await executionRepository.findOne({ scheduleId });

        await executionRepository.ping(scheduleId);

        const entityAfterPing = await executionRepository.findOne({ scheduleId });
        expect(entityAfterPing?.timestamp).toBeGreaterThan(entity!.timestamp);
      });
    });
  });
});
