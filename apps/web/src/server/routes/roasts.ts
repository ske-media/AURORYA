// POST /roasts (SPEC §7.3, §13.3, §14). Cache d'abord ; ne renvoie jamais d'erreur de génération tant
// qu'un repli existe.
import { type RoastResult, buildRoastSheet, chartFacts, factLabel, generateRoast } from '@aurorya/ai';
import { ChartPayloadSchema, type GrammaticalGender, KbEntrySchema, type KbEntry, type Locale, PostRoastsInputSchema, type RoastOutput, type RoastResponse, type ToneMode } from '@aurorya/shared';
import { z } from 'zod';
import type { AppDeps } from '../deps';
import { ApiFailure, defineRoute, isPremium } from '../http';
import { configValue } from '../remote-config';

const FALLBACK_RETRY_MS = 10 * 60_000;
type ReadingRow = { id: string; content: RoastOutput; status: 'ok' | 'fallback'; variant: number; created_at: Date };

async function loadKb(deps: AppDeps, locale: Locale, kbVersion: string, keys: readonly string[]): Promise<(key: string) => KbEntry | null> {
  const { rows } = await deps.sql.query<{ key: string; body: unknown }>(
    'select key, body from public.interpretation_kb where locale = $1 and kb_version = $2 and key = any($3)', [locale, kbVersion, keys]);
  const entries = new Map<string, KbEntry>();
  for (const row of rows) {
    const parsed = KbEntrySchema.safeParse(row.body);
    if (parsed.success) entries.set(row.key, parsed.data);
  }
  return (key) => entries.get(key) ?? null;
}

const respond = (row: ReadingRow, mode: ToneMode, labels: Map<string, string>): RoastResponse => ({
  readingId: row.id, mode, variant: row.variant, status: row.status,
  punchlines: row.content.punchlines.map((p) => ({ anchor: p.anchor, label: labels.get(p.anchor) ?? '', text: p.text })),
  hooks: row.content.hooks,
});

export const postRoasts = defineRoute({
  name: 'POST /roasts',
  auth: 'required',
  input: PostRoastsInputSchema,
  rateLimit: { configKey: 'limits.roasts_per_hour', fallback: 20, windowSeconds: 3600 },
  handler: async ({ deps, user, input, requestId }) => {
    const { sql } = deps;
    const now = deps.now();
    const owner = (await sql.query<{ payload: unknown; grammatical_gender: GrammaticalGender; locale: Locale }>(
      `select c.payload, p.grammatical_gender, p.locale from public.charts c join public.profiles p on p.id = c.user_id
       where c.id = $1 and c.user_id = $2 and c.is_current`, [input.chartId, user.uid])).rows[0];
    if (!owner) throw new ApiFailure('NOT_FOUND', 'thème introuvable');
    const chart = ChartPayloadSchema.parse(owner.payload);
    const englishEnabled = await configValue(sql, now, 'flags.locale_en_enabled', z.boolean(), false);
    const locale: Locale = englishEnabled ? owner.locale : 'fr';
    const gender = owner.grammatical_gender;
    const kbVersion = await configValue(sql, now, 'content.kb_version', z.string(), '1');
    const prompts = deps.prompts[locale][input.mode];
    const labels = new Map(chartFacts(chart).map((f) => [f.factId, factLabel(f, locale)]));

    const cacheParams = [input.chartId, input.mode, locale, gender, prompts.promptVersion, kbVersion];
    const cacheWhere = `chart_id = $1 and kind = 'roast' and mode = $2 and locale = $3 and grammatical_gender = $4 and prompt_version = $5 and kb_version = $6`;
    const latest = async (): Promise<ReadingRow | undefined> =>
      (await sql.query<ReadingRow>(`select id, content, status, variant, created_at from public.readings where ${cacheWhere} order by variant desc limit 1`, cacheParams)).rows[0];

    let variant = 0;
    const cached = await latest();
    if (input.regenerate) {
      if (!(await configValue(sql, now, 'flags.roast_regen_enabled', z.boolean(), true))) throw new ApiFailure('FORBIDDEN', 'régénération désactivée');
      if (!(await isPremium(deps, user.uid))) throw new ApiFailure('PREMIUM_REQUIRED', 'régénération réservée au Premium');
      const quota = await configValue(sql, now, 'quota.roast_regen_per_day', z.number().int(), 3);
      const used = (await sql.query<{ n: string }>(
        `select count(*) as n from public.readings where user_id = $1 and kind = 'roast' and variant > 0 and created_at > $2`, [user.uid, new Date(now.getTime() - 86_400_000)])).rows[0];
      if (Number(used?.n ?? 0) >= quota) throw new ApiFailure('QUOTA_EXCEEDED', 'quota de régénération atteint');
      variant = (cached?.variant ?? -1) + 1;
    } else if (cached && (cached.status === 'ok' || now.getTime() - new Date(cached.created_at).getTime() < FALLBACK_RETRY_MS)) {
      // Un repli récent est resservi ; passé dix minutes, la génération est retentée.
      return { body: respond(cached, input.mode, labels) };
    } else if (cached) {
      variant = cached.variant;
    }

    const aiEnabled = await configValue(sql, now, 'flags.ai_generation_enabled', z.boolean(), true);
    const keys = [...new Set(chartFacts(chart).map((f) => f.kbKey))];
    const ctx = { chart, mode: input.mode, locale, gender, kb: await loadKb(deps, locale, kbVersion, keys) };

    const stored = await sql.transaction(async (tx) => {
      // Deux requêtes concurrentes sur la même clé ne déclenchent pas deux générations (SPEC §14.8).
      await tx.query('select pg_advisory_xact_lock(hashtextextended($1, 0))', [cacheParams.join('|')]);
      if (!input.regenerate) {
        const again = (await tx.query<ReadingRow>(`select id, content, status, variant, created_at from public.readings where ${cacheWhere} and variant = ${variant}`, cacheParams)).rows[0];
        if (again && again.status === 'ok') return again;
      }
      const generated = await generateRoast(ctx, { llm: aiEnabled ? deps.llm : null, prompts, requestId });
      if (!generated.ok) throw new ApiFailure('GENERATION_UNAVAILABLE', 'génération indisponible');
      const result: RoastResult = generated.value;
      for (const usage of result.usage) {
        await tx.query(
          `insert into public.ai_usage (user_id, feature, tier, model, tokens_in, tokens_out, cost_microusd, outcome) values ($1, $2, $3, $4, $5, $6, 0, $7)`,
          [user.uid, usage.tier === 'judge' ? 'judge' : 'roast', usage.tier, usage.model, usage.tokensIn, usage.tokensOut, result.outcome]);
      }
      deps.logger.info('roast', { requestId, feature: 'roast', outcome: result.outcome, failureCodes: result.failureCodes, model: result.model });
      const row = (await tx.query<ReadingRow>(
        `insert into public.readings (user_id, chart_id, kind, variant, mode, locale, grammatical_gender, content, facts_hash, prompt_version, kb_version, model, status, created_at)
         values ($1, $2, 'roast', $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         on conflict (chart_id, kind, coalesce(section_key, ''), coalesce(local_date, date '1970-01-01'), variant, mode, locale, grammatical_gender, prompt_version, kb_version)
         do update set content = excluded.content, facts_hash = excluded.facts_hash, model = excluded.model, status = excluded.status, created_at = excluded.created_at
         returning id, content, status, variant, created_at`,
        [user.uid, input.chartId, variant, input.mode, locale, gender, JSON.stringify(result.content), result.factsHash, prompts.promptVersion, kbVersion, result.model, result.status, now])).rows[0];
      if (!row) throw new Error('lecture non écrite');
      return row;
    });
    return { status: stored.created_at.getTime() === now.getTime() ? 201 : 200, body: respond(stored, input.mode, labels) };
  },
});

/** Exposé pour les tests : la fiche envoyée au LLM pour un thème donné. */
export const roastSheetFor = buildRoastSheet;
