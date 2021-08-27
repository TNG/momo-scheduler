import { MongoClient } from 'mongodb';

import { ExecutionInfo } from '../job/ExecutionInfo';
import { Job, MomoJobStatus } from '../job/Job';
import { JobEntity } from './JobEntity';
import { Logger } from '../logging/Logger';
import { Repository } from './Repository';
import { createJobEntity } from './createJobEntity';
import { findLatest } from '../job/findLatest';

export const JOBS_COLLECTION_NAME = 'jobs';

export class JobRepository extends Repository<JobEntity> {
  constructor(mongoClient: MongoClient) {
    super(mongoClient, JOBS_COLLECTION_NAME);
  }

  async check(name: string): Promise<ExecutionInfo | undefined> {
    const job = await this.findOne({ name });
    return job?.executionInfo;
  }

  async clear(): Promise<void> {
    await this.delete();
  }

  async define(job: Job, logger?: Logger): Promise<void> {
    const { name, interval, concurrency, maxRunning } = job;

    logger?.debug('define job', { name, concurrency, interval, maxRunning });

    const old = await this.keepLatest(name, logger);

    if (old) {
      logger?.debug('update job in database', { name });
      await this.updateJob(name, createJobEntity(job));
      return;
    }

    logger?.debug('save job to database', { name });
    await this.save(createJobEntity(job));
  }

  private async keepLatest(name: string, logger?: Logger): Promise<JobEntity | undefined> {
    const jobs = await this.find({ name });

    if (jobs.length === 1) return jobs[0];

    const latest = findLatest(jobs);
    if (!latest) return undefined;

    logger?.debug('duplicate job, keep latest only', { name, count: jobs.length });

    jobs.splice(jobs.indexOf(latest), 1);
    await this.delete({ _id: { $in: jobs.map(({ _id }) => _id) } });

    return latest;
  }

  async list(): Promise<MomoJobStatus[]> {
    const jobs = await this.find();

    return jobs.map((job) => {
      return {
        name: job.name,
        interval: job.interval,
        concurrency: job.concurrency,
        maxRunning: job.maxRunning,
        executionInfo: job.executionInfo,
      };
    });
  }

  async updateJob(name: string, update: Partial<JobEntity>): Promise<void> {
    await this.updateOne({ name }, { $set: update });
  }
}
