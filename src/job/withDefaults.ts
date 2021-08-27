import { Job } from './Job';
import { MomoJob } from './MomoJob';

export function withDefaults(job: MomoJob): Job {
  return { immediate: false, concurrency: 1, maxRunning: 0, ...job };
}
