import { getExecutionRepository } from '../repository/getRepository';

export const pingInterval = 1000;

export class ExecutionPing {
  private handle?: NodeJS.Timeout;

  constructor(private readonly executionId: string) {}

  start(): void {
    const executionRepository = getExecutionRepository();
    if (this.handle !== undefined) {
      throw new Error('executionPing cannot be started twice');
    }
    this.handle = setInterval(() => executionRepository.ping(this.executionId), pingInterval);
  }

  async stop(): Promise<void> {
    if (this.handle !== undefined) {
      clearInterval(this.handle);
    }
    const executionRepository = getExecutionRepository();
    await executionRepository.delete({ executionId: this.executionId });
  }
}
