import { Column, Entity, Index, ObjectID, ObjectIdColumn } from 'typeorm';

interface Executions {
  [name: string]: number;
}

@Entity({ name: 'executions' })
export class ExecutionsEntity {
  @ObjectIdColumn()
  public _id?: ObjectID;

  @Index()
  @Column()
  public scheduleId: string;

  @Column()
  public timestamp: number;

  @Column()
  public executions: Executions;

  constructor(scheduleId: string, timestamp: number, executions: Executions) {
    this.scheduleId = scheduleId;
    this.timestamp = timestamp;
    this.executions = executions;
  }
}
