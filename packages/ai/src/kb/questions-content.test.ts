// Contrôle des questions du jour (SPEC §7.5, §14.9) : dix questions introspectives par signe lunaire,
// 140 caractères au plus, tutoiement, écriture épicène, ni prédiction ni sujet interdit.
import { existsSync, readFileSync } from 'node:fs';
import { SIGN_IDS } from '@aurorya/shared';
import { describe, expect, it } from 'vitest';
import { checkText } from '../validation/checks';

const FILE = new URL('../../../../content/questions/fr.json', import.meta.url);

describe.skipIf(!existsSync(FILE))('questions du jour françaises', () => {
  const content = existsSync(FILE) ? (JSON.parse(readFileSync(FILE, 'utf8')) as Record<string, string[]>) : {};
  it('donne dix questions à chaque signe lunaire, sans doublon', () => {
    expect(Object.keys(content).sort()).toEqual([...SIGN_IDS].sort());
    const all = Object.values(content).flat();
    for (const sign of SIGN_IDS) expect(content[sign]).toHaveLength(10);
    expect(new Set(all.map((q) => q.toLowerCase())).size).toBe(all.length);
  });
  it('respecte la forme et les règles de ton', () => {
    const problems: string[] = [];
    for (const [sign, questions] of Object.entries(content)) {
      questions.forEach((question, i) => {
        if (!/\?$/.test(question)) problems.push(`${sign}.${i} · ne finit pas par un point d’interrogation`);
        for (const f of checkText(question, { field: `${sign}.${i}`, locale: 'fr', mode: 'soft', gender: 'n', allowedMentions: new Set(), allowedTokens: [], minLength: 20, maxLength: 140 })) {
          problems.push(`${sign}.${i} · ${f.code} · ${f.detail}`);
        }
      });
    }
    expect(problems).toEqual([]);
  });
});
