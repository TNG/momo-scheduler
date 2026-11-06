import { inject } from 'vitest';

declare module 'vitest' {
  export interface ProvidedContext {
    mongoUri: string;
  }
}

export function getTestDbUri(database: string): string {
  return `${inject('mongoUri')}${database}`;
}
