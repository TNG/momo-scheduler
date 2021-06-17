import { sum } from 'lodash';
import { JobScheduler } from '../scheduler/JobScheduler';
import { JobExecutor } from '../executor/JobExecutor';
import { Job } from '../job/Job';
import { MomoJob } from '../job/MomoJob';
import { withDefaults } from '../job/withDefaults';
import { validate } from '../job/validate';
import { define } from '../job/define';
import { LogEmitter } from '../logging/LogEmitter';
import { getJobRepository } from '../repository/getJobRepository';
import { ExecutionStatus, JobResult } from '../job/ExecutionInfo';

export class Schedule extends LogEmitter {
  private jobs: { [name: string]: Job } = {};
  private jobSchedulers: { [name: string]: JobScheduler } = {};

  protected constructor() {
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
    if (name) {
      return this.jobSchedulers[name]?.getUnexpectedErrorCount() ?? 0;
    }
    return sum(Object.values(this.jobSchedulers).map((jobScheduler) => jobScheduler.getUnexpectedErrorCount()));
  }

  /**
   * Defines a job on the schedule and persists it in the database.
   *
   * A job is identified by its name. If a job with the same name already exists, the job is updated.
   *
   * If several jobs with the given name are found in the database, they are deleted and a new job is saved.
   *
   * Run start() to schedule a defined job. If the scheduler was already started before a job was defined,
   * the scheduler has to be started again to pick up the change.
   *
   * @param momoJob the job to define
   */
  public async define(momoJob: MomoJob): Promise<void> {
    const job = withDefaults(momoJob);

    if (!validate(job, this.logger)) {
      return;
    }

    await define(job, this.logger);
    this.jobs[momoJob.name] = job;
  }

  /**
   * Triggers a defined job to run immediately.
   * Does nothing if no job with this name exists.
   *
   * @param name the job to run
   * @returns the return value of the job's handler or one of: 'finished', 'max running reached' (job could not be executed), 'not found', 'failed'
   */
  public async run(name: string): Promise<JobResult> {
    const job = this.jobs[name];

    if (!job) {
      this.logger.debug('cannot run job - not found', { name });
      return { status: ExecutionStatus.notFound };
    }

    const jobScheduler = new JobScheduler(job, new JobExecutor(job, this.logger), this.logger);

    return jobScheduler.executeOnce();
  }

  /**
   * Schedules a defined job.
   * Does nothing if no job with this name exists.
   * If not provided with a name, all defined jobs are started.
   *
   * Updates made to jobs after starting the scheduler are picked up
   * automatically from the database, EXPECT for changes to the interval.
   * Start the scheduler again to change a job's interval.
   *
   * @param name the job to start
   */
  public async start(name?: string): Promise<void> {
    if (name) {
      this.logger.debug('start', { name });
      const job = this.jobs[name];
      if (job) await this.startScheduler(job);
      return;
    }

    this.logger.debug('start all jobs', { count: this.count() });
    await Promise.all(Object.values(this.jobs).map((job) => this.startScheduler(job)));
  }

  private async startScheduler(job: Job): Promise<void> {
    this.jobSchedulers[job.name]?.stop();
    this.jobSchedulers[job.name] = await new JobScheduler(job, new JobExecutor(job, this.logger), this.logger).run();
  }

  /**
   * Stops a scheduled job without removing it from neither the schedule nor the database.
   * Does not check whether a job exists.
   * Jobs can be started again using start().
   *
   * If not provided with a job name, all scheduled jobs are stopped.
   *
   * @param name the job to stop
   */
  public stop(name?: string): void {
    if (name) {
      this.logger.debug('stop', { name });
      this.jobSchedulers[name]?.stop();
      delete this.jobSchedulers[name];
      return;
    }

    this.logger.debug('stop all jobs', {
      count: this.count(),
    });
    Object.values(this.jobSchedulers).forEach((jobScheduler) => jobScheduler.stop());
    this.jobSchedulers = {};
  }

  /**
   * Stops a scheduled job and removes it from the schedule (but not from the database).
   * Does not check whether a job exists.
   *
   * If not provided with a job name, all scheduled jobs are canceled.
   *
   * @param name the job to cancel
   */
  public cancel(name?: string): void {
    if (name) {
      this.stop(name);
      this.logger.debug('cancel', { name });
      delete this.jobs[name];
      return;
    }

    this.stop();
    this.logger.debug('cancel all jobs');
    this.jobs = {};
  }

  /**
   * Cancels a scheduled job and removes it from the schedule and the database.
   * Does not check whether a job exists.
   *
   * If not provided with a job name, all scheduled jobs are removed.
   *
   * @param name the job to remove
   */
  public async remove(name?: string): Promise<void> {
    if (name) {
      this.cancel(name);
      this.logger.debug('remove', { name });
      await getJobRepository().delete({ name });
      return;
    }

    const names = Object.keys(this.jobs);
    this.cancel();
    this.logger.debug('remove all jobs');
    await getJobRepository().deleteMany({ where: { name: { $in: names } } });
  }

  /**
   * Returns the number of jobs on the schedule.
   *
   * @param started = false only count started jobs
   */
  public count(started = false): number {
    return started ? Object.values(this.jobSchedulers).length : Object.values(this.jobs).length;
  }

  /**
   * Returns all jobs on the schedule.
   */
  public list(): MomoJob[] {
    return Object.values(this.jobs);
  }

  /**
   * Returns a job. Returns undefined if no job with the given name is on the schedule.
   *
   * @param name the name of the job to return
   */
  public get(name: string): MomoJob | undefined {
    return this.jobs[name];
  }
}
