import { MongoMemoryServer } from 'mongodb-memory-server';

import { connect, disconnect } from '../../src/connect';
import { deadExecutionThreshold, ExecutionsRepository } from '../../src/repository/ExecutionsRepository';
import { getExecutionsRepository } from '../../src/repository/getRepository';
import { sleep } from '../utils/sleep';

describe('ExecutionsRepository', () => {
  const scheduleId = '123';
  const name = 'test job';

  let mongo: MongoMemoryServer;
  let executionsRepository: ExecutionsRepository;

  beforeAll(async () => {
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

  describe('executions', () => {
    beforeEach(async () => {
      await executionsRepository.addSchedule(scheduleId);
    });

    describe('addExecution', () => {
      it('can add an execution', async () => {
        const executionPing = await executionsRepository.addExecution(scheduleId, name, 1);
        expect(executionPing).toBeDefined();
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
        await sleep(deadExecutionThreshold);

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
});
