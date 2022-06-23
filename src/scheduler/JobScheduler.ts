import { DateTime } from 'luxon';
import { min } from 'lodash';
import humanInterval from 'human-interval';
import { Cron, parseCronExpression } from 'cron-schedule';
import { ExecutionStatus, JobResult } from '../job/ExecutionInfo';
import { ExecutionsRepository } from '../repository/ExecutionsRepository';
import { Job } from '../job/Job';
import { JobExecutor } from '../executor/JobExecutor';
import { JobRepository } from '../repository/JobRepository';
import { Logger } from '../logging/Logger';
import { MomoErrorType } from '../logging/error/MomoErrorType';
import { MomoJobDescription, jobDescriptionFromEntity } from '../job/MomoJobDescription';
import { TimeoutHandle, setSafeIntervalWithDelay } from '../timeout/setSafeIntervalWithDelay';
import { calculateDelayFromInterval } from './calculateDelayFromInterval';
import { momoError } from '../logging/error/MomoError';
import { JobEntity } from '../repository/JobEntity';
import { calculateDelayFromCronSchedule } from './calculateDelayFromCronSchedule';
import { setSafeTimeout } from '../timeout/safeTimeouts';
import { CronSchedule, Interval, isInterval } from '../job/MomoJob';

export class JobScheduler {
  private jobHandle?: TimeoutHandle;
  private unexpectedErrorCount = 0;
  private schedule?: Interval | CronSchedule;

  constructor(
    private readonly jobName: string,
    private readonly jobExecutor: JobExecutor,
    private readonly scheduleId: string,
    private readonly executionsRepository: ExecutionsRepository,
    private readonly jobRepository: JobRepository,
    private readonly logger: Logger
  ) {}

  static forJob(
    scheduleId: string,
    job: Job,
    logger: Logger,
    executionsRepository: ExecutionsRepository,
    jobRepository: JobRepository
  ): JobScheduler {
    const executor = new JobExecutor(job.handler, scheduleId, executionsRepository, jobRepository, logger);
    return new JobScheduler(job.name, executor, scheduleId, executionsRepository, jobRepository, logger);
  }

  getUnexpectedErrorCount(): number {
    return this.unexpectedErrorCount;
  }

  isStarted(): boolean {
    return this.jobHandle !== undefined;
  }

  async getJobDescription(): Promise<MomoJobDescription | undefined> {
    const jobEntity = await this.jobRepository.findOne({ name: this.jobName });
    if (!jobEntity) {
      this.logger.error(
        'get job description - job not found',
        MomoErrorType.scheduleJob,
        { name: this.jobName },
        momoError.jobNotFound
      );
      return;
    }

    const running = await this.executionsRepository.countRunningExecutions(jobEntity.name);
    const schedulerStatus = this.schedule === undefined ? undefined : { schedule: this.schedule, running };

    return { ...jobDescriptionFromEntity(jobEntity), schedulerStatus };
  }

  async start(): Promise<void> {
    await this.stop();

    const jobEntity = await this.jobRepository.findOne({ name: this.jobName });
    if (!jobEntity) {
      this.logger.error(
        'cannot schedule job',
        MomoErrorType.scheduleJob,
        { name: this.jobName },
        momoError.jobNotFound
      );
      return;
    }

    if (isInterval(jobEntity.schedule)) {
      this.handleIntervalJob(jobEntity, this.calculateInterval(jobEntity.schedule), jobEntity.schedule.firstRunAfter);
    } else {
      this.handleCronScheduleJob(jobEntity, this.extractCron(jobEntity.schedule));
    }
  }

  private calculateInterval(interval: Interval): number {
    const parsedInterval = humanInterval(interval.interval);
    if (parsedInterval === undefined || isNaN(parsedInterval)) {
      // the interval was already validated when the job was defined
      throw momoError.nonParsableInterval;
    }
    return parsedInterval;
  }

  private handleIntervalJob(jobEntity: JobEntity, interval: number, firstRunAfter: number): void {
    this.schedule = jobEntity.schedule;

    const delay = calculateDelayFromInterval(interval, jobEntity, firstRunAfter);

    this.jobHandle = setSafeIntervalWithDelay(
      this.executeConcurrently.bind(this),
      interval,
      delay,
      this.logger,
      'Concurrent execution failed'
    );

    this.logger.debug(`scheduled job to run at ${DateTime.now().plus({ milliseconds: delay }).toISO()}`, {
      name: this.jobName,
      interval,
      delay,
    });
  }

  private extractCron(cronSchedule: CronSchedule): Cron {
    try {
      return parseCronExpression(cronSchedule.cronSchedule);
    } catch {
      // the cron schedule was already validated when the job was defined
      throw momoError.nonParsableCronSchedule;
    }
  }

  private handleCronScheduleJob(jobEntity: JobEntity, delayCron: Cron): void {
    const delay = calculateDelayFromCronSchedule(delayCron);
    this.schedule = jobEntity.schedule;
    const executeAndReschedule = async (): Promise<void> => {
      await this.executeConcurrently();
      this.handleCronScheduleJob(jobEntity, delayCron);
    };

    const timeout = setSafeTimeout(executeAndReschedule.bind(this), delay, this.logger, 'Concurrent execution failed');

    this.jobHandle = { get: () => timeout };
  }

  async stop(): Promise<void> {
    if (this.jobHandle) {
      clearInterval(this.jobHandle.get());
      this.jobExecutor.stop();
      await this.executionsRepository.removeJob(this.scheduleId, this.jobName);
      this.jobHandle = undefined;
      this.schedule = undefined;
    }
  }

  async executeOnce(): Promise<JobResult> {
    try {
      const jobEntity = await this.jobRepository.findOne({ name: this.jobName });
      if (!jobEntity) {
        this.logger.error(
          'job not found, skip execution',
          MomoErrorType.executeJob,
          { name: this.jobName },
          momoError.jobNotFound
        );
        return {
          status: ExecutionStatus.notFound,
        };
      }

      return this.jobExecutor.execute(jobEntity);
    } catch (e) {
      this.handleUnexpectedError(e);
      return {
        status: ExecutionStatus.failed,
      };
    }
  }

  async executeConcurrently(): Promise<void> {
    try {
      const jobEntity = await this.jobRepository.findOne({ name: this.jobName });
      if (!jobEntity) {
        this.logger.error(
          'job not found, skip execution',
          MomoErrorType.executeJob,
          { name: this.jobName },
          momoError.jobNotFound
        );
        return;
      }

      const running = await this.executionsRepository.countRunningExecutions(jobEntity.name);
      const numToExecute =
        jobEntity.maxRunning > 0
          ? min([jobEntity.concurrency, jobEntity.maxRunning - running]) ?? jobEntity.concurrency
          : jobEntity.concurrency;
      this.logger.debug('execute job', { name: this.jobName, times: numToExecute });

      for (let i = 0; i < numToExecute; i++) {
        // eslint-disable-next-line no-void
        void this.jobExecutor.execute(jobEntity).catch((e) => {
          this.handleUnexpectedError(e);
        });
      }
    } catch (e) {
      this.handleUnexpectedError(e);
    }
  }

  private handleUnexpectedError(error: unknown): void {
    this.unexpectedErrorCount++;
    this.logger.error(
      'an unexpected error occurred while executing job',
      MomoErrorType.executeJob,
      { name: this.jobName },
      error
    );
  }
}
