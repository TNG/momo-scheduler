import { mockJobRepository } from './utils/mockJobRepository';
import { isConnected } from '../src';

describe('isConnected', () => {
  beforeEach(() => jest.restoreAllMocks());

  it('reports connection', () => {
    mockJobRepository();
    expect(isConnected()).toBe(true);
  });

  it('reports missing connection', () => {
    expect(isConnected()).toBe(false);
  });
});
