import type { ObjectId } from 'mongodb';

import type { ExecutionInfo } from '../job/ExecutionInfo.js';
import type { JobDefinition, ParsedIntervalSchedule } from '../job/Job.js';
import type { CronSchedule, NeverSchedule } from '../job/MomoJob.js';

export interface JobEntity<
  Schedule extends ParsedIntervalSchedule | CronSchedule | NeverSchedule =
    | ParsedIntervalSchedule
    | CronSchedule
    | NeverSchedule,
> extends JobDefinition<Schedule> {
  _id?: ObjectId;
  executionInfo?: ExecutionInfo;
}
