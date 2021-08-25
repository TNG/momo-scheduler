import { MomoJob } from '../../src';
import { JobEntity } from '../../src/repository/JobEntity';
import { withDefaults } from '../../src/job/withDefaults';

// TODO remove this?
export function createJobEntity(job: MomoJob): JobEntity {
  return withDefaults(job);
}
