import { MongoMemoryServer } from 'mongodb-memory-server';
import { connect, disconnect } from '../src/connect';
import { isConnected } from '../src';

describe('connect', () => {
  let mongo: MongoMemoryServer;
  let url: string;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    url = await mongo.getUri();
  });

  afterAll(async () => await mongo.stop());

  it('connects mongo', async () => {
    await connect({ url });

    expect(isConnected()).toBe(true);
  });

  it('disconnects mongo', async () => {
    await connect({ url });
    await disconnect();

    expect(isConnected()).toBe(false);
  });
});
