import { EntityRepository, MongoRepository } from 'typeorm';

import { JobEntity } from './JobEntity';

@EntityRepository(JobEntity)
export class JobRepository extends MongoRepository<JobEntity> {
  async updateJob(name: string, update: Partial<JobEntity>): Promise<void> {
    const savedJobs = await this.find({ name });

    if (savedJobs[0] === undefined) {
      return;
    }
    const updatedJob = merge(savedJobs[0], update);

    await this.save(updatedJob);
  }
}

function merge(savedJob: JobEntity, { interval, concurrency, maxRunning, executionInfo }: Partial<JobEntity>) {
  if (interval !== undefined) {
    savedJob.interval = interval;
  }
  if (concurrency !== undefined) {
    savedJob.concurrency = concurrency;
  }
  if (maxRunning !== undefined) {
    savedJob.maxRunning = maxRunning;
  }
  if (executionInfo !== undefined) {
    savedJob.executionInfo = executionInfo;
  }
  return savedJob;
}
