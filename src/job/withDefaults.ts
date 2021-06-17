import { MomoJob } from './MomoJob';
import { Job } from './Job';

export function withDefaults(job: MomoJob): Job {
  return { immediate: false, concurrency: 1, maxRunning: 0, ...job };
}
