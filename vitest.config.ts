import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'carry_onlyGate/**/*.test.ts', 'partial_dataGate/**/*.test.ts'],
    passWithNoTests: true,
    testTimeout: 30_000,
  },
});
