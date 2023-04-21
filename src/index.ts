import { Settings } from 'luxon';

export { MomoOptions, MongoSchedule } from './schedule/MongoSchedule';
export { momoError } from './logging/error/MomoError';
export { MomoErrorType } from './logging/error/MomoErrorType';
export { MomoEvent, MomoErrorEvent, MomoEventData } from './logging/MomoEvents';
export { MomoJob, JobParameters } from './job/MomoJob';
export { MomoJobDescription, JobSchedulerStatus } from './job/MomoJobDescription';
export { ExecutionStatus } from './job/ExecutionInfo';
export { ExecutionInfo } from './job/ExecutionInfo';
export { MomoJobBuilder } from './job/MomoJobBuilder';
export { MongoScheduleBuilder } from './schedule/MongoScheduleBuilder';

// We don't parse any dates that might be invalid, but only get the current date time
Settings.throwOnInvalid = true;
declare module 'luxon' {
  interface TSSettings {
    throwOnInvalid: true;
  }
}
