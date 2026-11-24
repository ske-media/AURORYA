import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Alias « @/ » de l'app mobile, pour ses tests de logique pure.
  resolve: { alias: [{ find: /^@\/(?=services|features|store|i18n|theme|components|assets)/, replacement: `${fileURLToPath(new URL('./apps/mobile/src/', import.meta.url))}` }] },
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
