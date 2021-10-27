import { ExecutionsRepository } from '../repository/ExecutionsRepository';
import { Logger } from '../logging/Logger';
import { setSafeInterval } from '../timeout/safeTimeouts';

export class SchedulePing {
  private handle?: NodeJS.Timeout;

  constructor(
    private readonly scheduleId: string,
    private readonly executionsRepository: ExecutionsRepository,
    private readonly logger: Logger,
    private readonly interval: number
  ) {}

  start(): void {
    if (this.handle !== undefined) {
      return;
    }
    this.handle = setSafeInterval(
      async () => {
        await this.executionsRepository.ping(this.scheduleId);
        const deletedCount = await this.executionsRepository.clean();
        if (deletedCount > 0) {
          this.logger.debug('removed dead executions', { schedules: deletedCount });
        }
      },
      this.interval,
      this.logger
    );
  }

  async stop(): Promise<void> {
    if (this.handle !== undefined) {
      this.logger.debug('stop SchedulePing', { scheduleId: this.scheduleId });
      clearInterval(this.handle);
    }
    await this.executionsRepository.deleteOne({ scheduleId: this.scheduleId });
  }
}
