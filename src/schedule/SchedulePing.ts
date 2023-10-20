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
      this.logger.error(errorMessage, MomoErrorType.internal, this.schedulesRepository.getLogData(), e);
    }
    this.handle = setSafeInterval(this.checkActiveSchedule.bind(this), this.interval, this.logger, errorMessage);
  }

  private async checkActiveSchedule(): Promise<void> {
    const active = await this.schedulesRepository.setActiveSchedule();
    if (!active) {
      return;
    }

    this.logger.debug('This schedule is active', this.schedulesRepository.getLogData());

    if (this.startJobsStatus !== StartJobsStatus.notStarted) {
      return;
    }

    this.startJobsStatus = StartJobsStatus.inProgress;
    this.logger.debug('This schedule just turned active', this.schedulesRepository.getLogData());
    await this.startAllJobs();
    this.startJobsStatus = StartJobsStatus.finished;
    this.logger.debug('Finished starting scheduled jobs', this.schedulesRepository.getLogData());
  }

  async stop(): Promise<void> {
    if (this.handle) {
      this.logger.debug('stop SchedulePing', this.schedulesRepository.getLogData());
      clearInterval(this.handle);
    }

    await this.schedulesRepository.deleteOne();
  }
}
