import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.spec.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    globalSetup: ['./test/globalSetup.ts'],
    typecheck: {
      tsconfig: './tsconfig.test.json',
    },
  },
  esbuild: {
    target: 'esnext',
  },
  optimizeDeps: {
    disabled: false,
  },
});
