import { JobEntity } from './JobEntity';
import { MomoJob } from '../job/MomoJob';
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
