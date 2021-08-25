import { getConnection } from '../connect';
import { ExecutionsRepository } from './ExecutionsRepository';
import { JobRepository } from './JobRepository';

let jobRepository: JobRepository | undefined;
let executionsRepository: ExecutionsRepository | undefined;

export function getJobRepository(): JobRepository {
  if (jobRepository === undefined) {
    jobRepository = new JobRepository(getConnection());
  }
  return jobRepository;
}

export function getExecutionsRepository(): ExecutionsRepository {
  if (executionsRepository === undefined) {
    executionsRepository = new ExecutionsRepository(getConnection());
  }
  return executionsRepository;
}
