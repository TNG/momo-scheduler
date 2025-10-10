import type { ObjectId } from 'mongodb';

import type { ExecutionInfo } from '../job/ExecutionInfo';
import type { JobDefinition, ParsedIntervalSchedule } from '../job/Job';
import type { CronSchedule, NeverSchedule } from '../job/MomoJob';

export interface JobEntity<
  Schedule extends ParsedIntervalSchedule | CronSchedule | NeverSchedule =
    | ParsedIntervalSchedule
    | CronSchedule
    | NeverSchedule,
> extends JobDefinition<Schedule> {
  _id?: ObjectId;
  executionInfo?: ExecutionInfo;
}
