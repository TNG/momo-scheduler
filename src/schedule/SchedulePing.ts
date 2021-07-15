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
      await executionsRepository.ping(this.scheduleId);
      const deletedCount = await executionsRepository.clean();
      if (deletedCount > 0) {
        this.logger.debug('removed dead schedule(s) from executions collection', { count: deletedCount });
      }
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
