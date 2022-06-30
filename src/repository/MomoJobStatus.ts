import { JobEntity } from './JobEntity';

export type MomoJobStatus = Omit<JobEntity, '_id' | 'parsedInterval'>;

export function toMomoJobStatus<T extends MomoJobStatus>({
  name,
  interval,
  firstRunAfter,
  concurrency,
  maxRunning,
}: T): MomoJobStatus {
  return { name, interval, firstRunAfter, concurrency, maxRunning };
}
