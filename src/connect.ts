import { Connection, createConnection, getConnection } from 'typeorm';
import { JobEntity } from './repository/JobEntity';
import { JobRepository } from './repository/JobRepository';
import { isConnected } from './isConnected';
import { Logger } from './logging/Logger';

export const connectionName = 'momo';

export interface MomoConnectionOptions {
  url: string;
}

export async function connect(connectionOptions: MomoConnectionOptions, logger?: Logger): Promise<Connection> {
  if (isConnected()) {
    return getConnection(connectionName);
  }

  logger?.debug('connect to database');
  const connection = await createConnection({
    ...connectionOptions,
    type: 'mongodb',
    name: connectionName,
    useUnifiedTopology: true,
    entities: [JobEntity],
  });

  logger?.debug('create index');
  await connection.getCustomRepository(JobRepository).createCollectionIndex({ name: 1 }, { name: 'job_name_index' });

  return connection;
}

export async function disconnect(): Promise<void> {
  await getConnection(connectionName).close();
}
