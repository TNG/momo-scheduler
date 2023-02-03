import { SchedulesRepository } from '../repository/SchedulesRepository';
import { Logger } from '../logging/Logger';
import { setSafeInterval } from '../timeout/safeTimeouts';
import { MomoErrorType } from '../logging/error/MomoErrorType';

export class SchedulePing {
  private handle?: NodeJS.Timeout;
  private startedJobs: boolean = false;

  constructor(
    private readonly scheduleId: string,
    private readonly schedulesRepository: SchedulesRepository,
    private readonly logger: Logger,
    private readonly interval: number,
    private readonly startAllJobs: () => Promise<void>
  ) {}

  async start(): Promise<void> {
    if (this.handle) {
      return;
    }
    const errorMessage = 'Pinging or cleaning the Schedules repository failed';
    try {
      await this.checkActiveSchedule();
    } catch (e) {
      this.logger.error(errorMessage, MomoErrorType.internal, {}, e);
    }
    this.handle = setSafeInterval(this.checkActiveSchedule.bind(this), this.interval, this.logger, errorMessage);
  }

  private async checkActiveSchedule(): Promise<void> {
    const active = await this.isActiveSchedule();
    if (active) {
      await this.schedulesRepository.ping(this.scheduleId);
      if (!this.startedJobs) {
        await this.startAllJobs();
        this.startedJobs = true;
      }
    }
  }

  private async isActiveSchedule(): Promise<boolean> {
    return this.schedulesRepository.isActiveSchedule();
  }

  async stop(): Promise<void> {
    if (this.handle) {
      this.logger.debug('stop SchedulePing', { scheduleId: this.scheduleId });
      clearInterval(this.handle);
    }
    await this.schedulesRepository.deleteOne({ scheduleId: this.scheduleId });
  }
}
