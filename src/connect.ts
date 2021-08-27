import { Connection, createConnection, getConnection } from 'typeorm';

import { ExecutionsEntity } from './repository/ExecutionsEntity';
import { ExecutionsRepository } from './repository/ExecutionsRepository';
import { JobEntity } from './repository/JobEntity';
import { JobRepository } from './repository/JobRepository';
import { isConnected } from './isConnected';

export const connectionName = 'momo';

export interface MomoConnectionOptions {
  url: string;
}

export async function connect(connectionOptions: MomoConnectionOptions): Promise<Connection> {
  if (isConnected()) {
    return getConnection(connectionName);
  }

  const connection = await createConnection({
    ...connectionOptions,
    type: 'mongodb',
    name: connectionName,
    useUnifiedTopology: true,
    entities: [ExecutionsEntity, JobEntity],
  });

  await connection.getCustomRepository(JobRepository).createCollectionIndex({ name: 1 }, { name: 'job_name_index' });
  await connection
    .getCustomRepository(ExecutionsRepository)
    .createCollectionIndex({ scheduleId: 1 }, { name: 'schedule_id_index' });

  return connection;
}

export async function disconnect(): Promise<void> {
  await getConnection(connectionName).close();
}
