import { JobEntity } from '../../src/repository/JobEntity';
import { MomoJob } from '../../src';
import { withDefaults } from '../../src/job/withDefaults';

export function createJobEntity(job: MomoJob): JobEntity {
  return JobEntity.from(withDefaults(job));
}
