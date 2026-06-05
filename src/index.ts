import { Settings } from 'luxon';

export { ExecutionInfo, ExecutionStatus } from './job/ExecutionInfo.js';
export { JobParameters, MomoJob } from './job/MomoJob.js';
export { MomoJobBuilder } from './job/MomoJobBuilder.js';
export {
  JobSchedulerStatus,
  MomoJobDescription,
} from './job/MomoJobDescription.js';
export { momoError } from './logging/error/MomoError.js';
export { MomoErrorType } from './logging/error/MomoErrorType.js';
export { MomoErrorEvent, MomoEvent, MomoEventData } from './logging/MomoEvents.js';
export { MomoOptions, MongoSchedule } from './schedule/MongoSchedule.js';
export { MongoScheduleBuilder } from './schedule/MongoScheduleBuilder.js';

// We don't parse any dates that might be invalid, but only get the current date time
Settings.throwOnInvalid = true;
declare module 'luxon' {
  interface TSSettings {
    throwOnInvalid: true;
  }
}
