import { getConnection } from 'typeorm';
import { connectionName } from '../connect';
import { ExecutionRepository } from './ExecutionRepository';
import { JobRepository } from './JobRepository';

export function getJobRepository(): JobRepository {
  return getConnection(connectionName).getCustomRepository(JobRepository);
}

export function getExecutionRepository(): ExecutionRepository {
  return getConnection(connectionName).getCustomRepository(ExecutionRepository);
}
