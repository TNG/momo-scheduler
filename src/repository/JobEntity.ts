import { ObjectId } from 'mongodb';

import { ExecutionInfo } from '../job/ExecutionInfo';
import { JobDefinition, ParsedIntervalSchedule } from '../job/Job';
import { CronSchedule } from '../job/MomoJob';

export interface JobEntity<
  Schedule extends ParsedIntervalSchedule | CronSchedule = ParsedIntervalSchedule | CronSchedule
> extends JobDefinition<Schedule> {
  _id?: ObjectId;
  executionInfo?: ExecutionInfo;
}
