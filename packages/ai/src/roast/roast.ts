// Pipeline du roast (SPEC §7.3, §14) : fiche de faits → LLM → validation → une relance → repli déterministe.
import {
  type ChartPayload, type GrammaticalGender, type KbEntry, type Locale, type Result, type RoastOutput,
  RoastOutputSchema, SECTION_KEYS, type SectionKey, type ToneMode, err, ok,
} from '@aurorya/shared';
import { z } from 'zod';
import { type Fact, type Mention, factLabel } from '../facts/facts';
import { type ScoredFact, selectRoastFacts } from '../facts/salience';
import type { LlmPort, TokenUsage } from '../ports/llm-port';
import { sectionFacts } from '../sections';
import { NAME_TOKEN } from '../tokens';
import { applyTypography } from '../typography';
import { type Failure, checkText } from '../validation/checks';

export const ROAST_LIMITS: Readonly<Record<Locale, { min: number; max: number }>> = { fr: { min: 40, max: 120 }, en: { min: 40, max: 110 } };
export const HOOK_MAX_LENGTH = 220;

export type KbLookup = (kbKey: string) => KbEntry | null;
export type RoastContext = Readonly<{ chart: ChartPayload; mode: ToneMode; locale: Locale; gender: GrammaticalGender; kb: KbLookup }>;

const roastWeight = (kb: KbLookup) => (key: string): number => kb(key)?.roastWeight ?? 0;

/** Données transmises au LLM. Ni prénom, ni date, ni heure, ni lieu, ni longitude (lois 1 et 8, SPEC §14.2). */
export function buildRoastSheet(ctx: RoastContext): { sheet: ScoredFact[]; user: string } {
  const sheet = selectRoastFacts(ctx.chart, roastWeight(ctx.kb));
  const describe = (fact: Fact) => {
    const entry = ctx.kb(fact.kbKey);
    // Les degrés ne partent pas : ils trahiraient la date de naissance.
    const donnees = Object.fromEntries(Object.entries(fact.data).filter(([key]) => key !== 'degree' && key !== 'minute'));
    return {
      fact_id: fact.factId,
      libelle: factLabel(fact, ctx.locale),
      donnees,
      regles: entry ? { keywords: entry.keywords, essence: entry.essence, light: entry.light, shadow: entry.shadow, behaviors: entry.behaviors, avoid: entry.avoid } : null,
    };
  };
  const sections = SECTION_KEYS.map((key) => ({
    key,
    faits_disponibles: sectionFacts(ctx.chart, key, roastWeight(ctx.kb)).slice(0, 3).map((s) => ({ fact_id: s.fact.factId, libelle: factLabel(s.fact, ctx.locale) })),
  }));
  return { sheet, user: JSON.stringify({ mode: ctx.mode, accord: ctx.gender, faits: sheet.map((s) => describe(s.fact)), sections }) };
}

/** Chaîne V1 à V8 appliquée à une sortie de roast. */
export function validateRoast(output: unknown, ctx: RoastContext, sheet: readonly ScoredFact[]): Result<RoastOutput, Failure[]> {
  const parsed = RoastOutputSchema.safeParse(output);
  if (!parsed.success) return err(parsed.error.issues.map((i) => ({ code: 'V1_SCHEMA' as const, field: i.path.join('.'), detail: i.code })));
  const data = parsed.data;
  const failures: Failure[] = [];
  const byId = new Map(sheet.map((s) => [s.fact.factId, s.fact]));
  const sheetMentions = new Set<Mention>(sheet.flatMap((s) => s.fact.mentions));

  // V2 — ancres dans la fiche, distinctes, couvrant au moins deux corps.
  const anchors = data.punchlines.map((p) => p.anchor);
  anchors.forEach((anchor, i) => {
    if (!byId.has(anchor)) failures.push({ code: 'V2_ANCHORS', field: `punchlines.${i}.anchor`, detail: 'ancre hors fiche' });
  });
  if (new Set(anchors).size !== anchors.length) failures.push({ code: 'V2_ANCHORS', field: 'punchlines', detail: 'ancres en double' });
  const bodies = new Set(anchors.flatMap((a) => byId.get(a)?.bodies ?? []));
  const kinds = new Set(anchors.map((a) => byId.get(a)?.kind));
  if (bodies.size < 2 && !(bodies.size === 1 && kinds.has('dominant'))) failures.push({ code: 'V2_ANCHORS', field: 'punchlines', detail: 'moins de deux corps couverts' });

  const base = { locale: ctx.locale, mode: ctx.mode, gender: ctx.gender, allowedMentions: sheetMentions };
  data.punchlines.forEach((p, i) => {
    failures.push(...checkText(p.text, { ...base, field: `punchlines.${i}.text`, allowedTokens: [], minLength: ROAST_LIMITS[ctx.locale].min, maxLength: ROAST_LIMITS[ctx.locale].max }));
  });
  if (new Set(data.punchlines.map((p) => p.text.trim().toLowerCase())).size !== 3) failures.push({ code: 'V5_FORM', field: 'punchlines', detail: 'punchlines identiques' });
  for (const key of SECTION_KEYS) {
    const allowed = new Set<Mention>([...sheetMentions, ...sectionFacts(ctx.chart, key, roastWeight(ctx.kb)).flatMap((s) => s.fact.mentions)]);
    failures.push(...checkText(data.hooks[key], { ...base, allowedMentions: allowed, field: `hooks.${key}`, allowedTokens: [NAME_TOKEN], maxLength: HOOK_MAX_LENGTH }));
  }
  return failures.length > 0 ? err(failures) : ok(data);
}

/** Repli déterministe (SPEC §14.7) : punchlines de secours et essences de la base de règles. */
export function fallbackRoast(ctx: RoastContext, sheet: readonly ScoredFact[]): Result<RoastOutput, { code: 'KB_MISSING'; detail: string }> {
  const punchlines: { anchor: string; text: string }[] = [];
  const bodies = new Set<string>();
  for (const { fact } of sheet) {
    if (punchlines.length === 3) break;
    const angle = ctx.kb(fact.kbKey)?.roastAngles[ctx.mode][0];
    if (!angle) continue;
    // La troisième punchline doit garantir deux corps couverts.
    if (punchlines.length === 2 && bodies.size === 1 && fact.bodies.every((b) => bodies.has(b))) continue;
    punchlines.push({ anchor: fact.factId, text: angle });
    for (const b of fact.bodies) bodies.add(b);
  }
  if (punchlines.length < 3) return err({ code: 'KB_MISSING', detail: 'punchlines de secours' });
  const hooks = {} as Record<SectionKey, string>;
  for (const key of SECTION_KEYS) {
    const essence = sectionFacts(ctx.chart, key, roastWeight(ctx.kb)).map((s) => ctx.kb(s.fact.kbKey)?.essence).find((e) => e !== undefined)
      ?? sheet.map((s) => ctx.kb(s.fact.kbKey)?.essence).find((e) => e !== undefined);
    if (!essence) return err({ code: 'KB_MISSING', detail: `accroche ${key}` });
    hooks[key] = essence.length > HOOK_MAX_LENGTH ? `${essence.slice(0, HOOK_MAX_LENGTH - 1)}…` : essence;
  }
  return ok(RoastOutputSchema.parse({ punchlines, hooks }));
}

/** V9 — juge de conformité (questions fermées, SPEC Annexe A.6). */
export const JudgeSchema = z.strictObject({
  bodyOrHealth: z.boolean(), prediction: z.boolean(), advice: z.boolean(), demeaning: z.boolean(), explicitOrHate: z.boolean(),
});
export type JudgeVerdict = z.infer<typeof JudgeSchema>;

export type RoastPrompts = Readonly<{ system: string; judgeSystem: string; promptVersion: string }>;
export type RoastResult = Readonly<{
  content: RoastOutput;
  status: 'ok' | 'fallback';
  model: string;
  outcome: 'ok' | 'retry_ok' | 'fallback';
  /** Codes d'échec rencontrés, sans aucun texte : journalisables. */
  failureCodes: string[];
  usage: (TokenUsage & { tier: string; model: string })[];
  factsHash: string;
}>;

const typeset = (content: RoastOutput, locale: Locale): RoastOutput => ({
  punchlines: content.punchlines.map((p) => ({ ...p, text: applyTypography(p.text, locale) })) as RoastOutput['punchlines'],
  hooks: Object.fromEntries(SECTION_KEYS.map((k) => [k, applyTypography(content.hooks[k], locale)])) as RoastOutput['hooks'],
});

/** Empreinte courte et stable d'une chaîne (cyrb53), pour les versions de prompts et de fiches. */
export const shortHash = (text: string): string => {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(14, '0');
};

export async function generateRoast(
  ctx: RoastContext,
  deps: { llm: LlmPort | null; prompts: RoastPrompts; requestId: string },
): Promise<Result<RoastResult, { code: 'GENERATION_UNAVAILABLE'; detail: string }>> {
  const { sheet, user } = buildRoastSheet(ctx);
  const factsHash = shortHash(user);
  const usage: RoastResult['usage'] = [];
  const failureCodes: string[] = [];

  if (deps.llm) {
    let feedback: string[] = [];
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const request = feedback.length > 0 ? JSON.stringify({ ...JSON.parse(user), echecs_precedents: feedback }) : user;
      const generated = await deps.llm.generateStructured({
        tier: 'strong', system: deps.prompts.system, user: request, schema: RoastOutputSchema, maxOutputTokens: 900, temperature: 0.9, requestId: deps.requestId,
      });
      if (!generated.ok) {
        failureCodes.push(`LLM_${generated.error.code}`);
        break; // la relance réseau appartient à l'adaptateur ; ici on passe au repli
      }
      usage.push({ ...generated.value.usage, tier: 'strong', model: generated.value.model });
      const checked = validateRoast(generated.value.data, ctx, sheet);
      let failures: Failure[] = checked.ok ? [] : checked.error;
      if (checked.ok) {
        const verdict = await deps.llm.generateStructured({
          tier: 'judge', system: deps.prompts.judgeSystem, schema: JudgeSchema, maxOutputTokens: 200, temperature: 0, requestId: deps.requestId,
          user: JSON.stringify({ textes: [...checked.value.punchlines.map((p) => p.text), ...Object.values(checked.value.hooks)] }),
        });
        if (!verdict.ok) failures = [{ code: 'V9_JUDGE', field: 'judge', detail: `indisponible : ${verdict.error.code}` }];
        else {
          usage.push({ ...verdict.value.usage, tier: 'judge', model: verdict.value.model });
          failures = Object.entries(verdict.value.data).filter(([, flagged]) => flagged).map(([question]) => ({ code: 'V9_JUDGE' as const, field: 'judge', detail: question }));
        }
        if (failures.length === 0) {
          return ok({ content: typeset(checked.value, ctx.locale), status: 'ok', model: generated.value.model, outcome: attempt === 0 ? 'ok' : 'retry_ok', failureCodes, usage, factsHash });
        }
      }
      feedback = [...new Set(failures.map((f) => `${f.code}:${f.field}:${f.detail}`))];
      failureCodes.push(...new Set(failures.map((f) => f.code)));
    }
  } else {
    failureCodes.push('LLM_DISABLED');
  }

  const fallback = fallbackRoast(ctx, sheet);
  if (!fallback.ok) return err({ code: 'GENERATION_UNAVAILABLE', detail: fallback.error.detail });
  return ok({ content: typeset(fallback.value, ctx.locale), status: 'fallback', model: 'fallback', outcome: 'fallback', failureCodes, usage, factsHash });
}
