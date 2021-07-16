import { mockRepositories } from './utils/mockRepositories';
import { isConnected } from '../src';

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
