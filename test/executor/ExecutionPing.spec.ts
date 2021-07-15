import { ExecutionPing, pingInterval } from '../../src/executor/ExecutionPing';
import { sleep } from '../utils/sleep';
import { ExecutionRepository } from '../../src/repository/ExecutionRepository';
import { mockRepositories } from '../utils/mockRepositories';
import { deepEqual, verify } from 'ts-mockito';

describe('ExecutionPing', () => {
  const executionId = '123';
  const executionPing = new ExecutionPing(executionId);
  let executionRepository: ExecutionRepository;

  beforeAll(() => (executionRepository = mockRepositories().executionRepository));

  it('starts and stops', async () => {
    executionPing.start();
    await sleep(pingInterval);

    verify(executionRepository.ping(executionId)).once();

    await executionPing.stop();
    await sleep(pingInterval);

    verify(executionRepository.ping(executionId)).once();
    verify(executionRepository.delete(deepEqual({ executionId }))).once();
  });
});
