import { Column, Entity, Index, ObjectID, ObjectIdColumn } from 'typeorm';

@Entity({ name: 'execution-pings' })
export class ExecutionEntity {
  @ObjectIdColumn()
  public _id?: ObjectID;

  @Index()
  @Column()
  public executionId: string;

  @Column()
  public timestamp: number;

  @Column()
  public name: string;

  constructor(executionId: string, timestamp: number, name: string) {
    this.executionId = executionId;
    this.timestamp = timestamp;
    this.name = name;
  }
}
