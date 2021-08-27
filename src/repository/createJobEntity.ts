import { MomoJob } from '../index';
import { JobEntity } from './JobEntity';
import { fromMomoJob } from '../job/Job';

export function createJobEntity(momoJob: MomoJob): JobEntity {
  const job = fromMomoJob(momoJob);
  return {
    name: job.name,
    interval: job.interval,
    maxRunning: job.maxRunning,
    concurrency: job.concurrency,
  };
}
