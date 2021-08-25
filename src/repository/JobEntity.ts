import { ExecutionInfo } from '../job/ExecutionInfo';
import { ObjectId } from 'mongodb';

export interface JobEntity {
  _id?: ObjectId;
  name: string;
  interval: string;
  concurrency: number;
  maxRunning: number;
  executionInfo?: ExecutionInfo;
}
