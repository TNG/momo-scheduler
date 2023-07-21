import { SchedulesRepository } from '../repository/SchedulesRepository';
import { Logger } from '../logging/Logger';
import { setSafeInterval } from '../timeout/safeTimeouts';
import { MomoErrorType } from '../logging/error/MomoErrorType';

enum StartJobsStatus {
  notStarted,
  inProgress,
  finished,
}

export class SchedulePing {
  private handle?: NodeJS.Timeout;
  private startJobsStatus: StartJobsStatus = StartJobsStatus.notStarted;

  constructor(
    private readonly scheduleId: string,
    private readonly scheduleName: string,
    private readonly schedulesRepository: SchedulesRepository,
    private readonly logger: Logger,
    private readonly interval: number,
    private readonly startAllJobs: () => Promise<void>,
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
    const active = await this.schedulesRepository.isActiveSchedule(this.scheduleName);
    this.logger.debug(`This schedule is ${active ? '' : 'not '}active`);
    if (active) {
      await this.schedulesRepository.ping(this.scheduleId);
      if (this.startJobsStatus === StartJobsStatus.notStarted) {
        this.startJobsStatus = StartJobsStatus.inProgress;
        this.logger.debug('This schedule just turned active');

        await this.startAllJobs();

        this.startJobsStatus = StartJobsStatus.finished;
        this.logger.debug('Finished starting scheduled jobs');
      }
    }
  }

  async stop(): Promise<void> {
    if (this.handle) {
      this.logger.debug('stop SchedulePing', { scheduleId: this.scheduleId });
      clearInterval(this.handle);
    }
    await this.schedulesRepository.deleteOne({ scheduleId: this.scheduleId });
  }
}
