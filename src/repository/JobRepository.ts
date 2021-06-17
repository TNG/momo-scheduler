import { EntityRepository, MongoRepository, ObjectLiteral } from 'typeorm';
import { JobEntity } from './JobEntity';

@EntityRepository(JobEntity)
export class JobRepository extends MongoRepository<JobEntity> {
  public async incrementRunning(name: string, maxRunning: number): Promise<boolean> {
    const query: ObjectLiteral = { name };
    if (maxRunning && maxRunning > 0) {
      query.running = { $lt: maxRunning };
    }

    const result = await this.findOneAndUpdate(query, { $inc: { running: 1 } });
    return result.lastErrorObject.updatedExisting;
  }

  public async decrementRunning(name: string): Promise<void> {
    if ((await this.findOne({ name }))?.running === 0) {
      return;
    }

    await this.findOneAndUpdate({ name }, { $inc: { running: -1 } });
  }

  public async updateJob(name: string, update: Partial<JobEntity>): Promise<void> {
    const savedJobs = await this.find({ name });

    if (savedJobs.length === 0) {
      return;
    }
    const updatedJob = merge(savedJobs, update);

    await this.save(updatedJob);
  }
}

function merge(savedJobs: JobEntity[], { interval, concurrency, maxRunning, executionInfo }: Partial<JobEntity>) {
  const updatedJob = savedJobs[0];
  if (interval !== undefined) {
    updatedJob.interval = interval;
  }
  if (concurrency !== undefined) {
    updatedJob.concurrency = concurrency;
  }
  if (maxRunning !== undefined) {
    updatedJob.maxRunning = maxRunning;
  }
  if (executionInfo !== undefined) {
    updatedJob.executionInfo = executionInfo;
  }
  return updatedJob;
}
