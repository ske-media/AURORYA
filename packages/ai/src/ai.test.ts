import { type ChartPayload, ChartPayloadSchema, type KbEntry, type RoastOutput, SECTION_KEYS, ok, err } from '@aurorya/shared';
import { describe, expect, it } from 'vitest';
import exactJson from './__fixtures__/chart-exact.json';
import unknownJson from './__fixtures__/chart-unknown-time.json';
import {
  type LlmPort, type RoastContext, applyTypography, buildRoastSheet, chartFacts, checkText, factLabel, fallbackRoast,
  generateRoast, replaceTokens, scoreFacts, sectionFacts, selectRoastFacts, shortHash, tokensIn, validateRoast,
} from './index';

const must = <T>(value: T | undefined): T => {
  if (value === undefined) throw new Error('valeur attendue');
  return value;
};
const exact: ChartPayload = ChartPayloadSchema.parse(exactJson);
const unknown: ChartPayload = ChartPayloadSchema.parse(unknownJson);

/** Base de règles synthétique : uniquement pour les tests. */
const entry = (key: string): KbEntry => ({
  keywords: ['un', 'deux', 'trois'], essence: `Essence neutre de la fiche, sans accord.`, light: ['force', 'élan'], shadow: ['travers', 'excès'],
  behaviors: ['relit ses messages', 'range avant de partir', 'note tout'],
  summary: { soft: 'Résumé doux.', cash: 'Résumé franc.', expert: 'Résumé précis.' },
  roastAngles: {
    soft: [`Une douceur têtue qui prend son temps pour se dire (${key.length}).`.replace(/\(\d+\)/, '')],
    cash: [`Tu dis « c’est rien » avec le dossier complet déjà archivé ${key.includes('moon') ? 'sous clé' : key.includes('sun') ? 'en tête' : 'quelque part'}.`],
    expert: ['Une logique intérieure exigeante structure ici la manière de réagir.'],
  },
  roastWeight: key.includes('moon') ? 3 : 1, avoid: [],
});
const kb = (key: string): KbEntry | null => entry(key);
const ctx: RoastContext = { chart: exact, mode: 'cash', locale: 'fr', gender: 'n', kb };

const check = (text: string, over: Partial<Parameters<typeof checkText>[1]> = {}) =>
  checkText(text, { field: 't', locale: 'fr', mode: 'cash', gender: 'n', allowedMentions: new Set(['body:moon', 'sign:pisces', 'house:7']), allowedTokens: [], maxLength: 200, ...over }).map((f) => f.code);

describe('faits', () => {
  const facts = chartFacts(exact);
  const ids = facts.map((f) => f.factId);
  it('couvre placements, angles, aspects, dominantes, stellium, maître, angulaire, rétrogrades', () => {
    expect(ids).toEqual(expect.arrayContaining([
      'placement:sun', 'placement:north_node', 'angle:asc', 'angle:mc', 'aspect:sun-mars', 'dominant:element:fire',
      'dominant:modality:cardinal', 'stellium:sign:aries', 'ruler:chart', 'angular:saturn', 'retrograde:venus',
    ]));
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.some((i) => i.includes('asc') && i.startsWith('aspect:'))).toBe(false);
  });
  it('rédige les libellés dans les deux langues', () => {
    const label = (id: string, locale: 'fr' | 'en') => factLabel(facts.find((f) => f.factId === id) ?? must(facts[0]), locale);
    expect(label('placement:moon', 'fr')).toBe('Lune en Poissons, maison VII');
    expect(label('placement:moon', 'en')).toBe('Moon in Pisces, 7th house');
    expect(label('placement:venus', 'fr')).toBe('Vénus en Bélier, maison VIII, rétrograde');
    expect(label('aspect:sun-mars', 'fr')).toBe('Carré Soleil–Mars');
    expect(label('aspect:sun-mars', 'en')).toBe('Sun–Mars square');
    expect(label('stellium:sign:aries', 'fr')).toBe('Stellium en Bélier');
    expect(label('ruler:chart', 'fr')).toBe('Soleil, maître de l’Ascendant');
    expect(label('angle:asc', 'fr')).toBe('Ascendant en Lion');
  });
  it('sans heure : aucun fait dépendant des maisons', () => {
    const f = chartFacts(unknown);
    expect(f.some((x) => x.kind === 'angle' || x.kind === 'ruler' || x.kind === 'angular')).toBe(false);
    expect(f.every((x) => !x.mentions.some((m) => m.startsWith('house:')))).toBe(true);
  });
});

describe('sélection des faits du roast', () => {
  const sheet = selectRoastFacts(exact, (k) => kb(k)?.roastWeight ?? 0);
  it('retient six faits, déterministes, dont un du Big Three, deux au plus par corps', () => {
    expect(sheet).toHaveLength(6);
    expect(selectRoastFacts(exact, (k) => kb(k)?.roastWeight ?? 0)).toEqual(sheet);
    expect(sheet.some((s) => ['placement:sun', 'placement:moon', 'angle:asc'].includes(s.fact.factId))).toBe(true);
    const counts = new Map<string, number>();
    for (const s of sheet) for (const b of s.fact.bodies) counts.set(b, (counts.get(b) ?? 0) + 1);
    expect(Math.max(...counts.values())).toBeLessThanOrEqual(2);
    for (let i = 1; i < sheet.length; i += 1) expect(must(sheet[i - 1]).salience).toBeGreaterThanOrEqual(must(sheet[i]).salience);
  });
  it('applique la formule de saillance', () => {
    // Soleil : base 5, maître de l'Ascendant +2, dans un stellium +2, poids de roast 1.
    const scored = scoreFacts(exact, (k) => kb(k)?.roastWeight ?? 0);
    const of = (id: string) => scored.find((s) => s.fact.factId === id)?.salience;
    expect(of('placement:sun')).toBe(10);
    // Lune : base 5, poids de roast 3. Saturne : base 2, angulaire +3, poids 1.
    expect(of('placement:moon')).toBe(8);
    expect(of('placement:saturn')).toBe(6);
    // Aspect Mars–Pluton : moyenne (4 + 1) / 2, orbe 0,3192 → +2,6808, poids 1.
    expect(of('aspect:mars-pluto')).toBe(6.1808);
  });
  it('donne à chaque section des faits existants', () => {
    for (const key of SECTION_KEYS) expect(sectionFacts(exact, key, () => 0).length).toBeGreaterThan(0);
    expect(sectionFacts(exact, 'love', () => 0).map((s) => s.fact.factId)).toContain('placement:venus');
    expect(sectionFacts(unknown, 'synthesis', () => 0).every((s) => s.fact.kind !== 'angular')).toBe(true);
  });
  it('ne transmet au LLM ni degrés, ni date, ni lieu, ni prénom', () => {
    const { user } = buildRoastSheet(ctx);
    expect(user).not.toMatch(/degree|minute|longitude|latitude|1993|Paris|utc|julian/i);
    expect(JSON.parse(user).faits).toHaveLength(6);
  });
});

describe('typographie', () => {
  const N = String.fromCharCode(0x202f);
  it('applique les règles françaises', () => {
    expect(applyTypography('Tu dis "c\'est rien" ?  Vraiment...', 'fr')).toBe(`Tu dis «${N}c’est rien${N}»${N}? Vraiment…`);
    expect(applyTypography('Attends : non ; si !', 'fr')).toBe(`Attends${N}: non${N}; si${N}!`);
    expect(applyTypography('Lune à 23° 4', 'fr')).toBe('Lune à 23°04′');
    expect(applyTypography('  un - deux  ', 'fr')).toBe('un – deux');
  });
  it('applique les règles anglaises', () => {
    expect(applyTypography('You say "it\'s fine" -- sure.', 'en')).toBe('You say “it’s fine”—sure.');
  });
  it('est idempotente', () => {
    const once = applyTypography('Tu dis "c\'est rien" : vraiment ?', 'fr');
    expect(applyTypography(once, 'fr')).toBe(once);
  });
});

describe('jetons', () => {
  it('repère et remplace les jetons', () => {
    expect(tokensIn('{{name}} et {{m2}}')).toEqual(['{{name}}', '{{m2}}']);
    expect(replaceTokens('{{name}} et {{m2}} et {{x}}', { '{{name}}': 'Léa', '{{m2}}': 'Inès' })).toBe('Léa et Inès et {{x}}');
  });
});

describe('contrôles de texte', () => {
  it('accepte un texte conforme', () => {
    expect(check('Tu relis la conversation trois fois avant de répondre, par principe.')).toEqual([]);
    expect(check('La Lune en Poissons, en maison VII, parle fort.')).toEqual([]);
  });
  it('V3 : refuse une notion absente des faits', () => {
    expect(check('Ta Lune en Scorpion garde tout.')).toContain('V3_CLAIMS');
    expect(check('Avec Saturne, rien n’est simple.')).toContain('V3_CLAIMS');
    expect(check('Ta maison VIII déborde.')).toContain('V3_CLAIMS');
    expect(check('Un trigone te sauve.')).toContain('V3_CLAIMS');
    expect(check('Une énergie rétrograde te suit.')).toContain('V3_CLAIMS');
    expect(check('Un tempérament saturnien.')).toContain('V3_CLAIMS');
    // Les mots courants en minuscules ne sont pas des noms d'astres.
    expect(check('Tu gardes la balance entre les deux, fier comme un lion.')).toEqual([]);
  });
  it('V4 et V5 : jetons, longueur, emoji, hashtag, markdown, adresse web, chiffres', () => {
    expect(check('Bonjour {{name}}, ça va.')).toContain('V4_TOKENS');
    expect(check('Bonjour {{name}}, ça va.', { allowedTokens: ['{{name}}'] })).toEqual([]);
    expect(check('x'.repeat(201))).toContain('V5_FORM');
    expect(check('court', { minLength: 40 })).toContain('V5_FORM');
    expect(check('Tu brilles ✨ partout.')).toContain('V5_FORM');
    expect(check('Tu brilles #astro partout.')).toContain('V5_FORM');
    expect(check('Tu es **franche** de nature.')).toContain('V5_FORM');
    expect(check('Fais le tien sur aurorya.app maintenant.')).toContain('V5_FORM');
    expect(check('Tu as 3 plans de secours.')).toContain('V5_FORM');
    expect(check('La Lune à 14°32′ en maison 7.')).toEqual([]);
  });
  it('V6 : adresse selon le mode et écriture épicène', () => {
    expect(check('Vous relisez tout avant de répondre.')).toContain('V6_ADDRESS');
    expect(check('Vous relisez tout avant de répondre.', { mode: 'expert' })).toEqual([]);
    expect(check('Tu relis tout avant de répondre.', { mode: 'expert' })).toContain('V6_ADDRESS');
    expect(check('Tu es têtue, et alors.')).toContain('V6_ADDRESS');
    expect(check('Tu es têtue, et alors.', { gender: 'f' })).toEqual([]);
    expect(check('Tu as du mal à lâcher.')).toEqual([]);
    expect(check('Tu es prêt·e à tout.', { gender: 'f' })).toContain('V6_ADDRESS');
  });
  it('V7 : refuse les prédictions', () => {
    for (const text of ['Tu vas rencontrer quelqu’un.', 'Tu rencontreras quelqu’un.', 'Bientôt, tout change.', 'En 2027, tout change.', 'C’est sûr, ça marche.']) {
      expect(check(text)).toContain('V7_PREDICTION');
    }
  });
  it('V8 : refuse les sujets interdits', () => {
    for (const text of ['Ton poids te préoccupe.', 'Ta santé passe après.', 'Tu devrais investir en bourse.', 'Tu es vraiment nulle.', 'Ta religion compte.']) {
      expect(check(text, { gender: 'f' })).toContain('V8_FORBIDDEN');
    }
    // Le signe du Cancer n'est pas la maladie.
    expect(check('La Lune en Cancer.', { allowedMentions: new Set(['body:moon', 'sign:cancer']) })).toEqual([]);
  });
  it('contrôle aussi l’anglais', () => {
    const en = (text: string) => check(text, { locale: 'en', allowedMentions: new Set(['body:moon']) });
    expect(en('You reread the chat three times before answering.')).toEqual([]);
    expect(en('You will meet someone.')).toContain('V7_PREDICTION');
    expect(en('Your Moon in Scorpio keeps score.')).toContain('V3_CLAIMS');
    expect(en('Your health comes second.')).toContain('V8_FORBIDDEN');
  });
});

describe('roast', () => {
  const { sheet } = buildRoastSheet(ctx);
  const anchors = sheet.map((s) => s.fact.factId);
  const hooks = Object.fromEntries(SECTION_KEYS.map((k) => [k, 'Tu avances vite, puis tu doutes en silence. La suite dit pourquoi.'])) as RoastOutput['hooks'];
  const good: RoastOutput = {
    punchlines: [
      { anchor: must(anchors[0]), text: 'Tu dis « c’est rien » avec le dossier complet déjà archivé dans ta tête.' },
      { anchor: must(anchors[1]), text: 'Tu réponds avant la fin de la question, et tu as raison une fois sur deux.' },
      { anchor: must(anchors[2]), text: 'Tu promets de te reposer, puis tu ranges toute la maison à minuit.' },
    ],
    hooks,
  };
  const fakeLlm = (outputs: unknown[], judge = { bodyOrHealth: false, prediction: false, advice: false, demeaning: false, explicitOrHate: false }): LlmPort & { calls: string[] } => {
    const calls: string[] = [];
    return {
      calls,
      generateStructured: async (request) => {
        calls.push(request.tier);
        if (request.tier === 'judge') return ok({ data: request.schema.parse(judge), usage: { tokensIn: 10, tokensOut: 5 }, model: 'faux-juge' });
        const next = outputs.shift();
        if (next === undefined) return err({ code: 'PROVIDER_ERROR' as const });
        return ok({ data: next as never, usage: { tokensIn: 100, tokensOut: 50 }, model: 'faux-modele' });
      },
    };
  };
  const prompts = { system: 's', judgeSystem: 'j', promptVersion: shortHash('s') };

  it('valide une sortie conforme et refuse les ancres fautives', () => {
    expect(validateRoast(good, ctx, sheet).ok).toBe(true);
    const outside = validateRoast({ ...good, punchlines: [{ ...good.punchlines[0], anchor: 'placement:zzz' }, good.punchlines[1], good.punchlines[2]] }, ctx, sheet);
    expect(!outside.ok && outside.error.map((f) => f.code)).toContain('V2_ANCHORS');
    const twice = validateRoast({ ...good, punchlines: [good.punchlines[0], { ...good.punchlines[1], anchor: anchors[0] }, good.punchlines[2]] }, ctx, sheet);
    expect(!twice.ok && twice.error.map((f) => f.code)).toContain('V2_ANCHORS');
    const schema = validateRoast({ punchlines: [] }, ctx, sheet);
    expect(!schema.ok && schema.error[0]?.code).toBe('V1_SCHEMA');
    const named = validateRoast({ ...good, punchlines: [{ ...good.punchlines[0], text: 'Bonjour {{name}}, tu archives tout dans ta tête, même le silence.' }, good.punchlines[1], good.punchlines[2]] }, ctx, sheet);
    expect(!named.ok && named.error.map((f) => f.code)).toContain('V4_TOKENS');
  });

  it('rend le texte généré, typographié, quand tout passe', async () => {
    const llm = fakeLlm([good]);
    const r = await generateRoast(ctx, { llm, prompts, requestId: 'r1' });
    if (!r.ok) throw new Error('échec');
    expect(r.value).toMatchObject({ status: 'ok', outcome: 'ok', model: 'faux-modele', failureCodes: [] });
    expect(r.value.content.punchlines[0].text).toContain(`«${String.fromCharCode(0x202f)}c’est rien`);
    expect(llm.calls).toEqual(['strong', 'judge']);
  });

  it('relance une seule fois avec les codes d’échec, puis réussit', async () => {
    const bad = { ...good, punchlines: [{ ...good.punchlines[0], text: 'Tu vas rencontrer quelqu’un de très ordonné très bientôt, promis.' }, good.punchlines[1], good.punchlines[2]] };
    const r = await generateRoast(ctx, { llm: fakeLlm([bad, good]), prompts, requestId: 'r2' });
    if (!r.ok) throw new Error('échec');
    expect(r.value).toMatchObject({ status: 'ok', outcome: 'retry_ok' });
    expect(r.value.failureCodes).toContain('V7_PREDICTION');
  });

  it('se replie sur la base de règles après deux échecs, un refus du juge, une panne, ou sans LLM', async () => {
    const bad = { ...good, hooks: { ...hooks, love: 'Ta santé passe après tes histoires.' } };
    for (const llm of [fakeLlm([bad, bad]), fakeLlm([good, good], { bodyOrHealth: true, prediction: false, advice: false, demeaning: false, explicitOrHate: false }), fakeLlm([]), null]) {
      const r = await generateRoast(ctx, { llm, prompts, requestId: 'r3' });
      if (!r.ok) throw new Error('échec');
      expect(r.value).toMatchObject({ status: 'fallback', model: 'fallback', outcome: 'fallback' });
      expect(r.value.content.punchlines).toHaveLength(3);
      expect(r.value.failureCodes.length).toBeGreaterThan(0);
    }
  });

  it('le repli respecte lui-même la chaîne de validation, et couvre deux corps', () => {
    const f = fallbackRoast(ctx, sheet);
    if (!f.ok) throw new Error('repli indisponible');
    const bodies = new Set(f.value.punchlines.flatMap((p) => sheet.find((s) => s.fact.factId === p.anchor)?.fact.bodies ?? []));
    expect(bodies.size).toBeGreaterThanOrEqual(2);
    expect(new Set(f.value.punchlines.map((p) => p.anchor)).size).toBe(3);
  });

  it('signale l’indisponibilité quand la base de règles est vide', async () => {
    const r = await generateRoast({ ...ctx, kb: () => null }, { llm: null, prompts, requestId: 'r4' });
    expect(r).toEqual({ ok: false, error: { code: 'GENERATION_UNAVAILABLE', detail: 'punchlines de secours' } });
  });
});
