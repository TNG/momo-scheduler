import { ObjectId } from 'mongodb';

import { ExecutionInfo } from '../job/ExecutionInfo';
import { JobDefinition } from '../job/Job';

export interface JobEntity extends JobDefinition {
  _id?: ObjectId;
  executionInfo?: ExecutionInfo;
}
