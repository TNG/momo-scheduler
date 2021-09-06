import { ObjectId } from 'mongodb';

interface Executions {
  [name: string]: number;
}

export interface ExecutionsEntity {
  _id?: ObjectId;
  scheduleId: string;
  timestamp: number;
  executions: Executions;
}
