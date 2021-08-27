import { isConnected } from '../src';
import { mockRepositories } from './utils/mockRepositories';

describe('isConnected', () => {
  beforeEach(() => jest.restoreAllMocks());

  it('reports connection', () => {
    mockRepositories();
    expect(isConnected()).toBe(true);
  });

  it('reports missing connection', () => {
    expect(isConnected()).toBe(false);
  });
});
