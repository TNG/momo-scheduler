import { ObjectId } from 'mongodb';

interface Executions {
  [name: string]: number;
}

export interface ScheduleEntity {
  _id?: ObjectId;
  name: 'schedule';
  scheduleId: string;
  lastAlive: number;
  executions: Executions;
}
