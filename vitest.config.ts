import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: [
        'src/lib/gpxParser.ts',
        'src/lib/server/functions.ts',
        'workers/tripCalculations.ts'
      ],
      reporter: ['text', 'html', 'lcov']
    }
  }
});
