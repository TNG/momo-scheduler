import { Job } from './Job';
import { JobEntity } from '../repository/JobEntity';
import { Logger } from '../logging/Logger';
import { getJobRepository } from '../repository/getRepository';
import { keepLatest } from './keepLatest';

export async function define(job: Job, logger?: Logger): Promise<void> {
  const { name, interval, concurrency, maxRunning } = job;

  logger?.debug('define job', { name, concurrency, interval, maxRunning });

  const jobEntity = JobEntity.from(job);
  const jobRepository = getJobRepository();
  const old = await keepLatest(name, logger);

  if (old) {
    logger?.debug('update job in database', { name });
    await jobRepository.updateJob(name, jobEntity);
    return;
  }

  logger?.debug('save job to database', { name });
  await jobRepository.save(jobEntity);
}
