import { isConnected } from '../index';
import { getJobRepository } from '../repository/getJobRepository';

/**
 * Removes all jobs from the database.
 */
export async function clear(): Promise<void> {
  if (!isConnected()) return;
  await getJobRepository().deleteMany({});
}
