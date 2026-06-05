import { type Mock, vi } from 'vitest';

type MockStub<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any ? Mock : T[K];
};

export function createMock<T extends object>(): {
  instance: T;
  stubs: MockStub<T>;
} {
  const stubs = {} as Record<PropertyKey, unknown>;
  const handler: ProxyHandler<object> = {
    get(_target, prop) {
      if (!(prop in stubs)) {
        stubs[prop] = vi.fn();
      }
      return stubs[prop];
    },
  };
  const instance = new Proxy({}, handler) as T;
  const stubsProxy = new Proxy({} as MockStub<T>, {
    get(_target, prop) {
      if (!(prop in stubs)) {
        stubs[prop] = vi.fn();
      }
      return stubs[prop];
    },
  }) as MockStub<T>;
  return { instance, stubs: stubsProxy };
}
