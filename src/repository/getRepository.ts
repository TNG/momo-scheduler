import { getConnection } from 'typeorm';
import { connectionName } from '../connect';
import { ExecutionsRepository } from './ExecutionsRepository';
import { JobRepository } from './JobRepository';

export function getJobRepository(): JobRepository {
  return getConnection(connectionName).getCustomRepository(JobRepository);
}

export function getExecutionsRepository(): ExecutionsRepository {
  return getConnection(connectionName).getCustomRepository(ExecutionsRepository);
}
