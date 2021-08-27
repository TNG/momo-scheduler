import { getJobRepository } from '../repository/getRepository';
import { isConnected } from '../index';

/**
 * Removes all jobs from the database.
 */
export async function clear(): Promise<void> {
  if (!isConnected()) return;
  await getJobRepository().deleteMany({});
}
