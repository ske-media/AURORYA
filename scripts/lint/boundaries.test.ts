import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

const eslint = new ESLint({ cwd: process.cwd() });

async function restricted(filePath: string, source: string): Promise<boolean> {
  const [result] = await eslint.lintText(source, { filePath });
  if (!result) throw new Error(`Aucun résultat ESLint pour ${filePath}`);
  return result.messages.some((m) => m.ruleId === 'no-restricted-imports');
}

describe('frontières entre paquets (SPEC §10)', () => {
  const refused: [string, string][] = [
    ['apps/mobile/src/x.ts', "import '@aurorya/astro-engine';"],
    ['apps/mobile/src/x.ts', "import '@aurorya/ai';"],
    ['apps/mobile/src/x.ts', "import '../../../packages/astro-engine/src/index';"],
    ['packages/ai/src/x.ts', "import '@aurorya/astro-engine';"],
    ['packages/astro-engine/src/x.ts', "import '@aurorya/ai';"],
    ['packages/shared/src/x.ts', "import '@aurorya/ai';"],
    ['packages/shared/src/x.ts', "import '@aurorya/astro-engine';"],
    ['packages/shared/src/x.ts', "import 'node:fs';"],
  ];
  it.each(refused)('%s refuse %s', async (file, source) => {
    expect(await restricted(file, source)).toBe(true);
  });

  const allowed: [string, string][] = [
    ['apps/mobile/src/x.ts', "import '@aurorya/shared';"],
    ['packages/astro-engine/src/x.ts', "import '@aurorya/shared';"],
    ['packages/ai/src/x.ts', "import '@aurorya/shared';"],
    ['apps/web/src/x.ts', "import '@aurorya/astro-engine';"],
    ['apps/web/src/x.ts', "import '@aurorya/ai';"],
  ];
  it.each(allowed)('%s accepte %s', async (file, source) => {
    expect(await restricted(file, source)).toBe(false);
  });
});
