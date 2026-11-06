import { MongoMemoryServer } from 'mongodb-memory-server';
import type { TestProject } from 'vitest/node';

export default async function globalSetup({ provide }: TestProject) {
  const mongo = await MongoMemoryServer.create();

  provide('mongoUri', mongo.getUri());

  return async () => {
    await mongo.stop();
  };
}
