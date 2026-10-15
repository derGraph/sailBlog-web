import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/database/**/*.test.ts'],
    environment: 'node',
    fileParallelism: false,
    testTimeout: 15000,
    hookTimeout: 15000
  }
});
