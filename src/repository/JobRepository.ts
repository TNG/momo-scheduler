import { MongoClient } from 'mongodb';

import { ExecutionInfo } from '../job/ExecutionInfo';
import { JobDefinition } from '../job/Job';
import { JobEntity } from './JobEntity';
import { Logger } from '../logging/Logger';
import { Repository } from './Repository';
import { findLatest } from '../job/findLatest';
import { MomoJobStatus, toMomoJobStatus } from './MomoJobStatus';

export const JOBS_COLLECTION_NAME = 'jobs';

export class JobRepository extends Repository<JobEntity> {
  private logger: Logger | undefined;

  constructor(mongoClient: MongoClient, collectionPrefix?: string) {
    super(mongoClient, JOBS_COLLECTION_NAME, collectionPrefix);
  }

  setLogger(logger: Logger): void {
    this.logger = logger;
  }

  async check(name: string): Promise<ExecutionInfo | undefined> {
    const job = await this.findOne({ name });
    return job?.executionInfo;
  }

  async define(job: JobDefinition): Promise<void> {
    const { name, schedule, concurrency, maxRunning } = job;

    this.logger?.debug('define job', {
      name,
      concurrency,
      ...schedule,
      maxRunning,
    });

    const old = await this.keepLatest(name);

    if (old) {
      this.logger?.debug('update job in database', { name });
      await this.updateJob(name, job);
      return;
    }

    this.logger?.debug('save job to database', { name });
    await this.save(job);
  }

  private async keepLatest(name: string): Promise<JobEntity | undefined> {
    const jobs = await this.find({ name });

    if (jobs.length === 1) return jobs[0];

    const latest = findLatest(jobs);
    if (!latest) return undefined;

    this.logger?.debug('duplicate job, keep latest only', { name, count: jobs.length });

    jobs.splice(jobs.indexOf(latest), 1);
    await this.delete({ _id: { $in: jobs.map(({ _id }) => _id) } });

    return latest;
  }

  async list(): Promise<MomoJobStatus[]> {
    const jobs = await this.find();

    return jobs.map((job) => ({ ...toMomoJobStatus(job), executionInfo: job.executionInfo }));
  }

  async updateJob(name: string, update: Partial<JobEntity>): Promise<void> {
    await this.updateOne({ name }, { $set: update });
  }

  async createIndex(): Promise<void> {
    await this.collection.createIndex({ name: 1 }, { name: 'job_name_index' });
    await this.collection.createIndex({ scheduleId: 1 }, { name: 'schedule_id_index' });
  }
}
