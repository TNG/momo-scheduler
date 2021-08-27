import { getConnection } from 'typeorm';

import { ExecutionsRepository } from './ExecutionsRepository';
import { JobRepository } from './JobRepository';
import { connectionName } from '../connect';

export function getJobRepository(): JobRepository {
  return getConnection(connectionName).getCustomRepository(JobRepository);
}

export function getExecutionsRepository(): ExecutionsRepository {
  return getConnection(connectionName).getCustomRepository(ExecutionsRepository);
}
