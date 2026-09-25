export async function sleep(millis: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, millis);
  });
}

/**
 * Waits until `offsetMillis` after the next full second.
 */
export async function sleepUntilAfterFullSecond(
  offsetMillis = 200,
): Promise<void> {
  return sleep((1000 + offsetMillis - (Date.now() % 1000)) % 1000);
}
