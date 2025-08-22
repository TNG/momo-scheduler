import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.spec.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
  },
  esbuild: {
    target: 'es2022',
  },
  optimizeDeps: {
    disabled: false,
  },
});
