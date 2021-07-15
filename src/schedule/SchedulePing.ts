import { Logger } from '../logging/Logger';
import { getExecutionsRepository } from '../repository/getRepository';

export const pingInterval = 1000;

export class SchedulePing {
  private handle?: NodeJS.Timeout;

  constructor(private readonly scheduleId: string, private readonly logger: Logger) {}

  start(): void {
    if (this.handle !== undefined) {
      return;
    }
    this.logger.debug('start SchedulerPing', { scheduleId: this.scheduleId });
    const executionsRepository = getExecutionsRepository();
    this.handle = setInterval(async () => {
      await executionRepository.ping(this.scheduleId);
    }, pingInterval);
  }

  async stop(): Promise<void> {
    if (this.handle !== undefined) {
      this.logger.debug('stop SchedulerPing', { scheduleId: this.scheduleId });
      clearInterval(this.handle);
    }
    await getExecutionsRepository().delete({ scheduleId: this.scheduleId });
  }
}
