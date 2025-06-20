import { ObjectId } from 'mongodb';

import { ExecutionInfo } from '../job/ExecutionInfo';
import { JobDefinition, ParsedIntervalSchedule } from '../job/Job';
import { CronSchedule, NeverSchedule } from '../job/MomoJob';

export interface JobEntity<
  Schedule extends ParsedIntervalSchedule | CronSchedule | NeverSchedule =
    | ParsedIntervalSchedule
    | CronSchedule
    | NeverSchedule,
> extends JobDefinition<Schedule> {
  _id?: ObjectId;
  executionInfo?: ExecutionInfo;
}
