import { MongoMemoryServer } from 'mongodb-memory-server';
import { connect, disconnect, getConnection } from '../src/connect';

describe('connect', () => {
  let mongo: MongoMemoryServer;
  let url: string;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    url = mongo.getUri();
  });

  afterAll(async () => await mongo.stop());

  it('connects mongo', async () => {
    await connect({ url });

    expect(getConnection()).not.toThrow();
  });

  it('disconnects mongo', async () => {
    await connect({ url });
    await disconnect();

    expect(getConnection()).not.toThrow();
  });
});
