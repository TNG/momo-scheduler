import { deepStrictEqual } from 'node:assert';
import { Matcher } from 'vitest-mock-extended';

export function matchObject<T extends object>(expectedValue: T): Matcher<T> {
  return new Matcher((actualValue: T) => {
    try {
      deepStrictEqual(actualValue, expectedValue);
      return true;
    } catch {
      return false;
    }
  }, 'matchObject()');
}
