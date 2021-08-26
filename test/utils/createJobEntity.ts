import { MomoJob } from '../../src';
import { JobEntity } from '../../src/repository/JobEntity';
import { fromMomoJob } from '../../src/job/Job';

// TODO remove this?
export function createJobEntity(job: MomoJob): JobEntity {
  return fromMomoJob(job);
}
