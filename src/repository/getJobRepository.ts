import { JobRepository } from './JobRepository';
import { getConnection } from 'typeorm';
import { connectionName } from '../connect';

export function getJobRepository(): JobRepository {
  return getConnection(connectionName).getCustomRepository(JobRepository);
}
