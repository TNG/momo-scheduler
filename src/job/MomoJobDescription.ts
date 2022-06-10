/**
 * information about scheduled job
 *
 * interval: the time interval at which job execution is triggered;
 * running: the number of currently running executions
 */
export interface JobSchedulerStatus {
  interval: string;
  running: number;
}

export interface MomoJobDescription {
  name: string;
  interval: string;
  concurrency: number;
  maxRunning: number;
  /** present only if the job is started */
  schedulerStatus?: JobSchedulerStatus;
}

export function toMomoJobDescription<T extends MomoJobDescription>({
  name,
  interval,
  concurrency,
  maxRunning,
}: T): MomoJobDescription {
  return { name, interval, concurrency, maxRunning };
}
