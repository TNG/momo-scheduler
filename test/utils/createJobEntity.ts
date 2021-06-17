import { MomoJob } from '../../src';
import { JobEntity } from '../../src/repository/JobEntity';
import { withDefaults } from '../../src/job/withDefaults';

export function createJobEntity(job: MomoJob): JobEntity {
  return JobEntity.from(withDefaults(job));
}
