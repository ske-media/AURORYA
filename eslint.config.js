// Règles de lint du monorepo. Les frontières entre paquets viennent de SPEC §10.
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/** Interdit d'importer un paquet interne, par son nom ou par un chemin relatif. */
const forbid = (packages, extraPatterns = []) => ({
  'no-restricted-imports': [
    'error',
    {
      patterns: [
        ...packages.map((name) => ({
          group: [`@aurorya/${name}`, `@aurorya/${name}/**`, `**/packages/${name}`, `**/packages/${name}/**`],
          message: `Frontière de paquet (SPEC §10) : import de « ${name} » interdit ici.`,
        })),
        ...extraPatterns,
      ],
    },
  ],
});

export default tseslint.config(
  { ignores: ['**/node_modules/**', '**/dist/**', '**/.next/**', '**/.expo/**', '**/coverage/**', '**/*.generated.ts', '**/expo-env.d.ts', '**/next-env.d.ts'] },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/ban-ts-comment': [
        'error',
        { 'ts-expect-error': 'allow-with-description', 'ts-ignore': true, 'ts-nocheck': true, minimumDescriptionLength: 10 },
      ],
    },
  },
  { files: ['scripts/**', '*.config.{js,ts}', 'apps/*/*.config.{js,ts}'], languageOptions: { globals: globals.node } },
  { files: ['apps/mobile/src/**'], languageOptions: { globals: { __DEV__: 'readonly' } } },
  {
    files: ['packages/shared/**'],
    rules: forbid(['astro-engine', 'ai'], [
      { group: ['node:*'], message: 'packages/shared : zéro dépendance Node (SPEC §10).' },
    ]),
  },
  { files: ['packages/astro-engine/**'], rules: forbid(['ai']) },
  { files: ['packages/ai/**'], rules: forbid(['astro-engine']) },
  { files: ['apps/mobile/**'], rules: forbid(['astro-engine', 'ai']) },
);
