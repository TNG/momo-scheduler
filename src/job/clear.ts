import { getJobRepository } from '../repository/getRepository';

/**
 * Removes all jobs from the database.
 */
export async function clear(): Promise<void> {
  await getJobRepository().delete({});
}
