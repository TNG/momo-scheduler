import { JobEntity } from '../repository/JobEntity';
import { Logger } from '../logging/Logger';
import { findLatest } from './findLatest';
import { getJobRepository } from '../repository/getRepository';

export async function keepLatest(name: string, logger?: Logger): Promise<JobEntity | undefined> {
  const jobRepository = getJobRepository();
  const jobs = await jobRepository.find({ name });

  if (jobs.length === 1) return jobs[0];

  const latest = findLatest(jobs);
  if (!latest) return undefined;

  logger?.debug('duplicate job, keep latest only', { name, count: jobs.length });

  jobs.splice(jobs.indexOf(latest), 1);
  await jobRepository.remove(jobs);

  return latest;
}
