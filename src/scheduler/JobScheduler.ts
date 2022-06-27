import { DateTime } from 'luxon';
import { min } from 'lodash';
import { ScheduledTask, schedule as cronSchedule, validate } from 'node-cron';
import humanInterval from 'human-interval';
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
import { CronSchedule, Interval, isInterval } from '../job/MomoJob';

export class JobScheduler {
  private intervalJobHandle?: TimeoutHandle;
  private cronJobHandle?: ScheduledTask;
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
    return this.intervalJobHandle !== undefined || this.cronJobHandle !== undefined;
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
      this.handleIntervalJob(jobEntity.schedule, jobEntity.executionInfo?.lastStarted);
    } else {
      this.handleCronScheduleJob(jobEntity.schedule);
    }
  }

  private handleIntervalJob(schedule: Interval, jobLastStarted: string | undefined): void {
    this.schedule = schedule;

    const parsedInterval = this.calculateInterval(schedule);
    const delay = calculateDelayFromInterval(schedule, jobLastStarted);

    this.intervalJobHandle = setSafeIntervalWithDelay(
      this.executeConcurrently.bind(this),
      parsedInterval,
      delay,
      this.logger,
      'Concurrent execution failed'
    );

    this.logger.debug(`scheduled job to run at ${DateTime.now().plus({ milliseconds: delay }).toISO()}`, {
      name: this.jobName,
      interval: parsedInterval,
      delay,
    });
  }

  private calculateInterval(interval: Interval): number {
    const parsedInterval = humanInterval(interval.interval);
    if (parsedInterval === undefined || isNaN(parsedInterval)) {
      // the interval was already validated when the job was defined
      throw momoError.nonParsableInterval;
    }
    return parsedInterval;
  }

  private handleCronScheduleJob(schedule: CronSchedule): void {
    if (!validate(schedule.cronSchedule)) {
      throw momoError.nonParsableCronSchedule;
    }

    this.schedule = schedule;
    this.cronJobHandle = cronSchedule(schedule.cronSchedule, this.executeConcurrently.bind(this));
  }

  async stop(): Promise<void> {
    if (this.intervalJobHandle) {
      clearInterval(this.intervalJobHandle.get());
      this.jobExecutor.stop();
      await this.executionsRepository.removeJob(this.scheduleId, this.jobName);
      this.intervalJobHandle = undefined;
      this.schedule = undefined;
    }
    if (this.cronJobHandle) {
      this.cronJobHandle.stop();
      this.jobExecutor.stop();
      await this.executionsRepository.removeJob(this.scheduleId, this.jobName);
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
