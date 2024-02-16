import { ObjectId } from 'mongodb';

import { ExecutionInfo } from '../job/ExecutionInfo';
import { JobDefinition, ParsedIntervalSchedule } from '../job/Job';
import { CronSchedule } from '../job/MomoJob';

export interface JobEntity<
  JobParams = unknown,
  Schedule extends ParsedIntervalSchedule | CronSchedule = ParsedIntervalSchedule | CronSchedule,
> extends JobDefinition<JobParams, Schedule> {
  _id?: ObjectId;
  executionInfo?: ExecutionInfo;
}
