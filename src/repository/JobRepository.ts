import { EntityRepository, MongoRepository } from 'typeorm';
import { JobEntity } from './JobEntity';

@EntityRepository(JobEntity)
export class JobRepository extends MongoRepository<JobEntity> {
  async updateJob(name: string, update: Partial<JobEntity>): Promise<void> {
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
