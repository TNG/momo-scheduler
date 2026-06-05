import { Settings } from 'luxon';

export type { ExecutionInfo } from './job/ExecutionInfo.js';
export { ExecutionStatus } from './job/ExecutionInfo.js';
export type { JobParameters, MomoJob } from './job/MomoJob.js';
export { MomoJobBuilder } from './job/MomoJobBuilder.js';
export type {
  JobSchedulerStatus,
  MomoJobDescription,
} from './job/MomoJobDescription.js';
export { momoError } from './logging/error/MomoError.js';
export { MomoErrorType } from './logging/error/MomoErrorType.js';
export type { MomoErrorEvent, MomoEvent, MomoEventData } from './logging/MomoEvents.js';
export type { MomoOptions } from './schedule/MongoSchedule.js';
export { MongoSchedule } from './schedule/MongoSchedule.js';
export { MongoScheduleBuilder } from './schedule/MongoScheduleBuilder.js';

// We don't parse any dates that might be invalid, but only get the current date time
Settings.throwOnInvalid = true;
declare module 'luxon' {
  interface TSSettings {
    throwOnInvalid: true;
  }
}
