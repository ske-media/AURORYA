// Contrôle de la base de règles (SPEC §14.3) : schéma, complétude par famille, longueurs, adresse,
// écriture épicène, sujets interdits, prédictions. Les fiches sont affichées sans passer par le LLM,
// elles doivent donc tenir seules toutes les règles du §5.
import { readFileSync, readdirSync } from 'node:fs';
import { type KbEntry, KbEntrySchema, type LabelBodyId, PLANET_IDS, SIGN_IDS, type SignId, TONE_MODES } from '@aurorya/shared';
import { describe, expect, it } from 'vitest';
import type { Mention } from '../facts/facts';
import { checkText } from '../validation/checks';

const DIR = new URL('../../../../content/kb/fr/', import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith('.json')).sort();
const SUMMARY_MAX = 240;
const ROAST = { min: 40, max: 120 };

/** Notions astrologiques qu'une fiche a le droit de citer, d'après sa clé. */
function allowedFor(key: string): Set<Mention> {
  const [family, a, b] = key.split(':');
  const out = new Set<Mention>();
  if (family === 'planet_sign' && a && b) { out.add(`body:${a as LabelBodyId}`); out.add(`sign:${b as SignId}`); }
  if ((family === 'asc_sign' || family === 'mc_sign') && a) { out.add(`body:${family === 'asc_sign' ? 'asc' : 'mc'}`); out.add(`sign:${a as SignId}`); }
  return out;
}

function expectedKeys(file: string): string[] | null {
  const [family, subject] = file.replace('.json', '').split('.');
  if (family === 'planet_sign' && subject) return SIGN_IDS.map((s) => `planet_sign:${subject}:${s}`);
  if (family === 'asc_sign' || family === 'mc_sign') return SIGN_IDS.map((s) => `${family}:${s}`);
  return null;
}

function problems(key: string, entry: KbEntry): string[] {
  const out: string[] = [];
  const allowedMentions = allowedFor(key);
  const run = (field: string, text: string, mode: (typeof TONE_MODES)[number], min: number | undefined, max: number): void => {
    for (const f of checkText(text, { field, locale: 'fr', mode, gender: 'n', allowedMentions, allowedTokens: [], maxLength: max, ...(min !== undefined ? { minLength: min } : {}) })) {
      out.push(`${key} · ${field} · ${f.code} · ${f.detail}`);
    }
  };
  for (const mode of TONE_MODES) {
    run(`summary.${mode}`, entry.summary[mode], mode, undefined, SUMMARY_MAX);
    entry.roastAngles[mode].forEach((text, i) => run(`roastAngles.${mode}.${i}`, text, mode, ROAST.min, ROAST.max));
  }
  // Champs descriptifs : impersonnels (ni tutoiement ni vouvoiement), contrôlés dans les deux registres.
  const neutral = [['essence', entry.essence], ...entry.light.map((t, i) => [`light.${i}`, t]), ...entry.shadow.map((t, i) => [`shadow.${i}`, t]), ...entry.behaviors.map((t, i) => [`behaviors.${i}`, t])] as [string, string][];
  for (const [field, text] of neutral) { run(field, text, 'cash', undefined, 260); run(field, text, 'expert', undefined, 260); }
  return [...new Set(out)];
}

describe('base de règles française', () => {
  it('contient au moins une famille', () => {
    expect(files.length).toBeGreaterThan(0);
  });
  it.each(files)('%s : fiches complètes et conformes', (file) => {
    const content = JSON.parse(readFileSync(new URL(file, DIR), 'utf8')) as Record<string, unknown>;
    const expected = expectedKeys(file);
    if (expected) expect(Object.keys(content).sort()).toEqual([...expected].sort());
    const found: string[] = [];
    for (const [key, raw] of Object.entries(content)) {
      const parsed = KbEntrySchema.safeParse(raw);
      if (!parsed.success) { found.push(`${key} · schéma · ${parsed.error.issues.map((i) => `${i.path.join('.')} ${i.code}`).join(', ')}`); continue; }
      found.push(...problems(key, parsed.data));
    }
    expect(found).toEqual([]);
  });
  it('ne décrit que des corps connus', () => {
    for (const file of files.filter((f) => f.startsWith('planet_sign.'))) {
      expect([...PLANET_IDS, 'north_node']).toContain(file.split('.')[1]);
    }
  });
});
