import { MongoMemoryServer } from 'mongodb-memory-server';
import { connect, disconnect } from '../../src/connect';
import { deadExecutionThreshold, ExecutionRepository } from '../../src/repository/ExecutionRepository';
import { getExecutionRepository } from '../../src/repository/getRepository';
import { sleep } from '../utils/sleep';

describe('ExecutionRepository', () => {
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

  describe('add', () => {
    it('can add an execution', async () => {
      const executionPing = await executionRepository.add(name, 1);
      expect(executionPing).toBeDefined();
    });

    it('cannot add an execution when maxRunning is reached', async () => {
      await executionRepository.add(name, 1);
      const executionPing = await executionRepository.add(name, 1);
      expect(executionPing).toBeUndefined();
    });

    it('can add an execution with maxRunning set to 0', async () => {
      const executionPing = await executionRepository.add(name, 0);
      expect(executionPing).toBeDefined();
    });
  });

  describe('executions', () => {
    it('returns number of executions', async () => {
      await executionRepository.add(name, 2);
      await executionRepository.add(name, 2);

      const running = await executionRepository.executions(name);
      expect(running).toBe(2);
    });

    it('does not count dead executions', async () => {
      await executionRepository.add(name, 2);
      await sleep(deadExecutionThreshold);
      await executionRepository.add(name, 2);

      const running = await executionRepository.executions(name);
      expect(running).toBe(1);
    });
  });

  describe('ping', () => {
    it('updates timestamp', async () => {
      await executionRepository.add(name, 2);
      const entity = await executionRepository.findOne({ name });

      await executionRepository.ping(entity!.executionId);

      const entityAfterPing = await executionRepository.findOne({ name });
      expect(entityAfterPing?.timestamp).toBeGreaterThan(entity!.timestamp);
    });
  });

  describe('clean', () => {
    it('cleans dead executions', async () => {
      await executionRepository.add(name, 2);
      await sleep(deadExecutionThreshold);
      await executionRepository.add(name, 2);

      const deadCount = await executionRepository.clean(name);
      expect(deadCount).toBe(1);
      expect(await executionRepository.count({ name })).toBe(1);
    });
  });
});
