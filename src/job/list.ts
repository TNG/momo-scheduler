import { MomoJobStatus } from './Job';
import { getJobRepository } from '../repository/getJobRepository';
import { isConnected } from '../isConnected';

/**
 * Lists all jobs stored in the database.
 */
export async function list(): Promise<MomoJobStatus[]> {
  if (!isConnected()) return [];
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
