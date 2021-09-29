import { Filter, MongoClient } from 'mongodb';

import { ExecutionInfo } from '../job/ExecutionInfo';
import { Job, MomoJobStatus, toJobDefinition } from '../job/Job';
import { JobEntity } from './JobEntity';
import { Logger } from '../logging/Logger';
import { Repository } from './Repository';
import { findLatest } from '../job/findLatest';

export const JOBS_COLLECTION_NAME = 'jobs';

function mapNullToUndefined(entity: JobEntity) {
  return {
    ...entity,
    delay: entity.delay === null ? undefined : entity.delay,
  };
}

export class JobRepository extends Repository<JobEntity> {
  private logger: Logger | undefined;

  constructor(mongoClient: MongoClient) {
    super(mongoClient, JOBS_COLLECTION_NAME);
  }

  setLogger(logger: Logger): void {
    this.logger = logger;
  }

  async check(name: string): Promise<ExecutionInfo | undefined> {
    const job = await this.findOne({ name });
    return job?.executionInfo;
  }

  async clear(): Promise<void> {
    await this.delete();
  }

  async define(job: Job): Promise<void> {
    const { name, interval, concurrency, maxRunning } = job;
    const jobDefinition = toJobDefinition(job);

    this.logger?.debug('define job', { name, concurrency, interval, maxRunning });

    const old = await this.keepLatest(name);

    if (old) {
      this.logger?.debug('update job in database', { name });
      await this.updateJob(name, jobDefinition);
      return;
    }

    this.logger?.debug('save job to database', { name });
    await this.save(jobDefinition);
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

  async findOne(filter: Filter<JobEntity> = {}): Promise<JobEntity | undefined> {
    const entity = await super.findOne(filter);
    return entity ? mapNullToUndefined(entity) : undefined;
  }

  async find(filter: Filter<JobEntity> = {}): Promise<JobEntity[]> {
    const entities = await super.find(filter);
    return entities.map(mapNullToUndefined);
  }

  async list(): Promise<MomoJobStatus[]> {
    const jobs = await this.find();

    return jobs.map((job) => ({ ...toJobDefinition(job), executionInfo: job.executionInfo }));
  }

  async updateJob(name: string, update: Partial<JobEntity>): Promise<void> {
    await this.updateOne({ name }, { $set: update });
  }
}
