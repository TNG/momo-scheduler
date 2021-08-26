import { ExecutionInfo } from '../job/ExecutionInfo';
import { ObjectId } from 'mongodb';
import { JobDefinition } from '../job/Job';

export interface JobEntity extends JobDefinition {
  _id?: ObjectId;
  executionInfo?: ExecutionInfo;
}
