import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/__tests__/**/*.test.ts'],
    testTimeout: 15000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'json-summary'],
      reportsDirectory: 'coverage',
      include: ['src/**/*.ts'],
      exclude: ['src/__tests__/**', 'src/server.ts', '**/*.config.ts'],
    },
    reporters: ['default', 'junit'],
    outputFile: {
      junit: 'reports/junit.xml',
    },
  },
});
