import { Column, Entity, Index, ObjectID, ObjectIdColumn } from 'typeorm';

import { ExecutionInfo } from '../job/ExecutionInfo';
import { Job } from '../job/Job';

@Entity({ name: 'jobs' })
export class JobEntity {
  @ObjectIdColumn()
  public _id?: ObjectID;

  @Index()
  @Column()
  public name: string;

  @Column()
  public interval: string;

  @Column()
  public concurrency: number;

  @Column()
  public maxRunning: number;

  @Column()
  public executionInfo?: ExecutionInfo;

  constructor(name: string, interval: string, concurrency: number, maxRunning: number, executionInfo?: ExecutionInfo) {
    this.name = name;
    this.interval = interval;
    this.concurrency = concurrency;
    this.maxRunning = maxRunning;
    this.executionInfo = executionInfo;
  }

  static from({ name, interval, concurrency, maxRunning }: Job): JobEntity {
    return new JobEntity(name, interval, concurrency, maxRunning);
  }
}
