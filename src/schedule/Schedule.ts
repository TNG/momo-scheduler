import { sum } from 'lodash';

import { ExecutionInfo, ExecutionStatus, JobResult } from '../job/ExecutionInfo';
import { ExecutionsRepository } from '../repository/ExecutionsRepository';
import { JobRepository } from '../repository/JobRepository';
import { JobScheduler } from '../scheduler/JobScheduler';
import { LogEmitter } from '../logging/LogEmitter';
import { MomoErrorType } from '../logging/error/MomoErrorType';
import { MomoJob } from '../job/MomoJob';
import { MomoJobDescription } from '../job/MomoJobDescription';
import { toJob } from '../job/Job';
import { validate } from '../job/validate';
import { setSafeTimeout } from '../timeout/safeTimeouts';

export class Schedule extends LogEmitter {
  private jobSchedulers: { [name: string]: JobScheduler } = {};

  constructor(
    private readonly scheduleId: string,
    private readonly executionsRepository: ExecutionsRepository,
    private readonly jobRepository: JobRepository
  ) {
    super();
  }

  /**
   * Returns the number of unexpected errors that occurred during execution of scheduled jobs.
   *
   * Unexpected errors are
   * - not caused by malformed input data
   * - not caused by the job itself
   * - but eg. caused by a broken database connection or other unexpected events
   *
   * @param name if provided with a job name, returns the unexpectedErrorCount for this job.
   * Returns 0 if no job with this name is scheduled.
   */
  public getUnexpectedErrorCount(name?: string): number {
    if (name !== undefined) {
      return this.jobSchedulers[name]?.getUnexpectedErrorCount() ?? 0;
    }
    return sum(Object.values(this.jobSchedulers).map((jobScheduler) => jobScheduler.getUnexpectedErrorCount()));
  }

  /**
   * Defines a job on the schedule and persists it in the database.
   *
   * A job is identified by its name. If a job with the same name already exists, the job is stopped and updated.
   *
   * If several jobs with the given name are found in the database, they are deleted and a new job is saved.
   *
   * Run start() to schedule a defined job. If the scheduler was already started before a job was defined,
   * the scheduler has to be started again to pick up the change.
   *
   * @param momoJob the job to define
   * @returns true if jobs was defined, false if the job was invalid
   *
   * @throws if the database throws
   */
  public async define(momoJob: MomoJob): Promise<boolean> {
    const job = toJob(momoJob);

    if (!validate(job, this.logger)) {
      return false;
    }
    await this.stopJob(job.name);

    await this.jobRepository.define(job);

    this.jobSchedulers[job.name] = JobScheduler.forJob(
      this.scheduleId,
      job,
      this.logger,
      this.executionsRepository,
      this.jobRepository
    );

    return true;
  }

  /**
   * Triggers a defined job to run once independently of the schedule.
   * Does nothing if no job with this name exists.
   *
   * Note that the returned promise will not be resolved until the job execution finished.
   * You might not want to await the promise if your specified delay is big.
   *
   * @param name the job to run
   * @param delay the job will be run after delay milliseconds
   * @returns the return value of the job's handler or one of: 'finished', 'max running reached' (job could not be executed), 'not found', 'failed'
   */
  public async run(name: string, delay = 0): Promise<JobResult> {
    const jobScheduler = this.jobSchedulers[name];

    if (!jobScheduler) {
      this.logger.debug('cannot run job - not found', { name });
      return { status: ExecutionStatus.notFound };
    }

    if (delay <= 0) {
      return jobScheduler.executeOnce();
    }

    return new Promise((resolve) =>
      setSafeTimeout(
        async () => resolve(await jobScheduler.executeOnce()),
        delay,
        this.logger,
        'Single execution failed'
      )
    );
  }

  /**
   * Schedule all defined jobs.
   *
   * Updates made to jobs after starting the scheduler are picked up
   * automatically from the database, EXCEPT for changes to the interval
   * or cron schedule.
   * Start the scheduler again to change a job's interval or cron schedule.
   *
   * @throws if the database throws
   */
  public async start(): Promise<void> {
    this.logger.debug('start all jobs', { count: this.count() });
    await Promise.all(Object.values(this.jobSchedulers).map(async (jobScheduler) => jobScheduler.start()));
  }

  /**
   * Schedules a defined job.
   * Does nothing if no job with the given name exists.
   *
   * Updates made to jobs after starting the scheduler are picked up
   * automatically from the database, EXCEPT for changes to the interval.
   * Start the scheduler again to change a job's interval.
   *
   * @param name the job to start
   * @throws if the database throws
   */
  public async startJob(name: string): Promise<void> {
    const jobScheduler = this.jobSchedulers[name];
    if (!jobScheduler) {
      this.logger.debug('job not found', { name });
      return;
    }

    this.logger.debug('start', { name });
    await jobScheduler.start();
  }

  /**
   * Stops a scheduled job without removing it from neither the schedule nor the database.
   * Does nothing if no job with the given name exists.
   * Jobs can be started again using start().
   *
   * @param name the job to stop
   */
  public async stopJob(name: string): Promise<void> {
    this.logger.debug('stop', { name });
    try {
      await this.jobSchedulers[name]?.stop();
    } catch (error) {
      this.logger.error('message failed to stop job', MomoErrorType.stopJob, { name }, error);
    }
  }

  /**
   * Stops all scheduled jobs without removing them from neither the schedule nor the database.
   * Jobs can be started again using start().
   */
  public async stop(): Promise<void> {
    this.logger.debug('stop all jobs', { count: this.count() });
    try {
      await Promise.all(Object.values(this.jobSchedulers).map(async (jobScheduler) => jobScheduler.stop()));
    } catch (error) {
      this.logger.error('message failed to stop jobs', MomoErrorType.stopJob, { count: this.count() }, error);
    }
  }

  /**
   * Stops a scheduled job and removes it from the schedule (but not from the database).
   * Does nothing if no job with the given name exists.
   *
   * @param name the job to cancel
   */
  public async cancelJob(name: string): Promise<void> {
    await this.stopJob(name);
    this.logger.debug('cancel', { name });
    delete this.jobSchedulers[name];
  }

  /**
   * Stops all scheduled jobs and removes them from the schedule (but not from the database).
   */
  public async cancel(): Promise<void> {
    await this.stop();
    this.logger.debug('cancel all jobs', { count: Object.keys(this.jobSchedulers).length });
    this.jobSchedulers = {};
  }

  /**
   * Stops a scheduled job and removes it from the schedule and the database.
   * Does nothing if no job with the given name exists.
   *
   * @param name the job to remove
   *
   * @throws if the database throws
   */
  public async removeJob(name: string): Promise<void> {
    await this.cancelJob(name);
    this.logger.debug('remove', { name });
    await this.jobRepository.deleteOne({ name });
  }

  /**
   * Stops all scheduled jobs and removes them from the schedule and the database.
   *
   * @throws if the database throws
   */
  public async remove(): Promise<void> {
    const names = Object.keys(this.jobSchedulers);
    await this.cancel();
    this.logger.debug('remove all jobs', { names: names.join(', ') });
    await this.jobRepository.delete({ name: { $in: names } });
  }

  /**
   * Returns the number of jobs on the schedule.
   *
   * @param started = false only count started jobs
   */
  public count(started = false): number {
    return started
      ? Object.values(this.jobSchedulers).filter((jobScheduler) => jobScheduler.isStarted()).length
      : Object.values(this.jobSchedulers).length;
  }

  /**
   * Returns descriptions of all jobs on the schedule.
   *
   * @throws if the database throws
   */
  public async list(): Promise<MomoJobDescription[]> {
    return (
      await Promise.all(Object.values(this.jobSchedulers).map(async (jobScheduler) => jobScheduler.getJobDescription()))
    ).filter((jobDescription): jobDescription is MomoJobDescription => jobDescription !== undefined);
  }
  /**
   * Retrieves execution information about the job from the database. Returns undefined if the job cannot be found or was never executed.
   *
   * @param name the job to check
   *
   * @throws if the database throws
   */
  public async check(name: string): Promise<ExecutionInfo | undefined> {
    return this.jobRepository.check(name);
  }

  /**
   * Removes all jobs from the database.
   *
   * NOTE:
   * This also removes jobs that are not on this schedule, but were defined by other schedules.
   * However, does NOT stop job executions - this will cause currently running jobs to fail.
   * Consider using stop/cancel/remove methods instead!
   *
   * @throws if the database throws
   */
  public async clear(): Promise<void> {
    await this.jobRepository.delete();
  }

  /**
   * Returns the description of a job or undefined if no job with the given name is on the schedule.
   *
   * @param name the name of the job to return
   *
   * @throws if the database throws
   */
  public async get(name: string): Promise<MomoJobDescription | undefined> {
    return this.jobSchedulers[name]?.getJobDescription();
  }
}
