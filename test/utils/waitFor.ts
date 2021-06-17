import { sleep } from './sleep';

export async function waitFor<T>(expectation: () => T | Promise<T>, timeout = 2000): Promise<T> {
  const millis = 100;
  let result: T;
  for (let i = 0; i < timeout / millis; i++) {
    try {
      result = await expectation();
    } catch (e) {
      await sleep(millis);
    }
  }
  result = await expectation();
  return result;
}
