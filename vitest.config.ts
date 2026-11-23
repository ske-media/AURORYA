import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Les tests de l'API partagent une même base : les fichiers s'exécutent l'un après l'autre.
    fileParallelism: false,
    globalSetup: ['apps/web/test/global-setup.ts'],
    include: [
      'packages/*/src/**/*.test.ts',
      'apps/*/src/**/*.test.{ts,tsx}',
      'scripts/**/*.test.ts',
    ],
  },
});
