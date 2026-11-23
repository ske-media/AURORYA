import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globalSetup: ['apps/web/test/global-setup.ts'],
    include: [
      'packages/*/src/**/*.test.ts',
      'apps/*/src/**/*.test.{ts,tsx}',
      'scripts/**/*.test.ts',
    ],
  },
});
