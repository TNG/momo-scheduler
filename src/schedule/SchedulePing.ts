import { Logger } from '../logging/Logger';
import { ExecutionsRepository } from '../repository/ExecutionsRepository';

export const defaultInterval = 60 * 1000;

export class SchedulePing {
  public static interval = defaultInterval;
  private handle?: NodeJS.Timeout;

  constructor(
    private readonly scheduleId: string,
    private readonly executionsRepository: ExecutionsRepository,
    private readonly logger: Logger
  ) {}

  start(): void {
    if (this.handle !== undefined) {
      return;
    }
    this.handle = setInterval(async () => {
      await this.executionsRepository.ping(this.scheduleId);
      const deletedCount = await this.executionsRepository.clean();
      if (deletedCount > 0) {
        this.logger.debug('removed dead executions', { schedules: deletedCount });
      }
    }, SchedulePing.interval);
  }

  async stop(): Promise<void> {
    if (this.handle !== undefined) {
      this.logger.debug('stop SchedulerPing', { scheduleId: this.scheduleId });
      clearInterval(this.handle);
    }
    await this.executionsRepository.deleteOne({ scheduleId: this.scheduleId });
  }
}
