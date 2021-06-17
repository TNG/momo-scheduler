export enum ExecutionStatus {
  finished = 'finished',
  maxRunningReached = 'max running reached',
  failed = 'failed',
  notFound = 'not found',
}

export interface JobResult {
  status: ExecutionStatus;
  handlerResult?: string;
}

export interface ExecutionInfo {
  lastStarted: string;
  lastFinished: string;
  lastResult: JobResult;
}
