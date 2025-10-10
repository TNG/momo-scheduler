import { Settings } from 'luxon';

export { ExecutionInfo, ExecutionStatus } from './job/ExecutionInfo';
export { JobParameters, MomoJob } from './job/MomoJob';
export { MomoJobBuilder } from './job/MomoJobBuilder';
export {
  JobSchedulerStatus,
  MomoJobDescription,
} from './job/MomoJobDescription';
export { momoError } from './logging/error/MomoError';
export { MomoErrorType } from './logging/error/MomoErrorType';
export { MomoErrorEvent, MomoEvent, MomoEventData } from './logging/MomoEvents';
export { MomoOptions, MongoSchedule } from './schedule/MongoSchedule';
export { MongoScheduleBuilder } from './schedule/MongoScheduleBuilder';

// We don't parse any dates that might be invalid, but only get the current date time
Settings.throwOnInvalid = true;
declare module 'luxon' {
  interface TSSettings {
    throwOnInvalid: true;
  }
}
