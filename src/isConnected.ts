import { getConnection } from 'typeorm';
import { connectionName } from './connect';

/**
 * Checks whether Momo is connected to a database.
 */
export function isConnected(): boolean {
  try {
    const connection = getConnection(connectionName);
    return connection.isConnected;
  } catch (e) {
    return false;
  }
}
