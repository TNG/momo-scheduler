import { MomoJobStatus } from './Job';
import { getJobRepository } from '../repository/getRepository';

/**
 * Lists all jobs stored in the database.
 */
export async function list(): Promise<MomoJobStatus[]> {
  const jobs = await getJobRepository().find();

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
