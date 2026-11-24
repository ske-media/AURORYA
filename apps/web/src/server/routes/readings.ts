// GET /readings/sections/{key}?mode= (SPEC §7.4, §13.3). Le serveur décide du droit : sans Premium, seule
// l'accroche part ; le texte complet n'est ni écrit ni transmis (D-014). Avec le droit, la section est écrite
// une fois, à la première ouverture, puis servie depuis `readings` (ADR-021).
import { SECTION_FALLBACK_VERSION, chartFacts, factLabel, fallbackSection, sectionFacts, shortHash } from '@aurorya/ai';
import { ChartPayloadSchema, type GrammaticalGender, type Locale, type RoastOutput, SECTION_KEYS, type SectionOutput, type SectionResponse, TONE_MODES } from '@aurorya/shared';
import { z } from 'zod';
import { ApiFailure, defineRoute, isPremium } from '../http';
import { configValue } from '../remote-config';
import { loadKb } from './roasts';

type SectionRow = { content: SectionOutput; status: 'ok' | 'fallback'; created_at: Date };

export const getSection = defineRoute({
  name: 'GET /readings/sections/*',
  auth: 'required',
  rateLimit: { configKey: 'limits.sections_per_hour', fallback: 60, windowSeconds: 3600 },
  handler: async ({ deps, user, params, query }): Promise<{ status?: number; body: SectionResponse }> => {
    const { sql } = deps;
    const now = deps.now();
    const key = z.enum(SECTION_KEYS).safeParse(params.key);
    const mode = z.enum(TONE_MODES).safeParse(query.get('mode'));
    if (!key.success || !mode.success) throw new ApiFailure('VALIDATION_FAILED', 'entrée invalide', { fields: [key.success ? 'mode' : 'key'] });

    const owner = (await sql.query<{ id: string; payload: unknown; grammatical_gender: GrammaticalGender; locale: Locale }>(
      `select c.id, c.payload, p.grammatical_gender, p.locale from public.charts c join public.profiles p on p.id = c.user_id
       where c.user_id = $1 and c.is_current`, [user.uid])).rows[0];
    if (!owner) throw new ApiFailure('NOT_FOUND', 'thème introuvable');
    const englishEnabled = await configValue(sql, now, 'flags.locale_en_enabled', z.boolean(), false);
    const locale: Locale = englishEnabled ? owner.locale : 'fr';
    const gender = owner.grammatical_gender;

    // L'accroche naît avec le roast (SPEC §7.4) : pas de roast dans ce mode, pas de section.
    const roast = (await sql.query<{ content: RoastOutput }>(
      `select content from public.readings where chart_id = $1 and kind = 'roast' and mode = $2 and locale = $3 and grammatical_gender = $4
       order by created_at desc limit 1`, [owner.id, mode.data, locale, gender])).rows[0];
    if (!roast) throw new ApiFailure('NOT_FOUND', 'roast absent pour ce mode');
    const head = { key: key.data, mode: mode.data, hook: roast.content.hooks[key.data] };
    if (!(await isPremium(deps, user.uid))) return { body: { ...head, locked: true } };

    const chart = ChartPayloadSchema.parse(owner.payload);
    const kbVersion = await configValue(sql, now, 'content.kb_version', z.string(), '1');
    const cacheParams = [owner.id, key.data, mode.data, locale, gender, SECTION_FALLBACK_VERSION, kbVersion];
    const select = `select content, status, created_at from public.readings where chart_id = $1 and kind = 'full_section' and section_key = $2
      and variant = 0 and mode = $3 and locale = $4 and grammatical_gender = $5 and prompt_version = $6 and kb_version = $7`;
    const labels = new Map(chartFacts(chart).map((f) => [f.factId, factLabel(f, locale)]));
    const respond = (row: SectionRow): SectionResponse => ({
      ...head, locked: false, status: row.status, paragraphs: row.content.paragraphs,
      anchors: row.content.anchors.map((anchor) => ({ anchor, label: labels.get(anchor) ?? '' })),
    });

    const cached = (await sql.query<SectionRow>(select, cacheParams)).rows[0];
    if (cached) return { body: respond(cached) };

    const keys = [...new Set(sectionFacts(chart, key.data, () => 0).map((s) => s.fact.kbKey))];
    const kb = await loadKb(deps, locale, kbVersion, keys);
    const written = fallbackSection({ chart, mode: mode.data, locale, kb }, key.data);
    if (!written.ok) throw new ApiFailure('GENERATION_UNAVAILABLE', 'génération indisponible');

    const stored = await sql.transaction(async (tx) => {
      // Deux ouvertures simultanées de la même section n'en écrivent qu'une (SPEC §14.8).
      await tx.query('select pg_advisory_xact_lock(hashtextextended($1, 0))', [`section|${cacheParams.join('|')}`]);
      const again = (await tx.query<SectionRow>(select, cacheParams)).rows[0];
      if (again) return again;
      const row = (await tx.query<SectionRow>(
        `insert into public.readings (user_id, chart_id, kind, section_key, variant, mode, locale, grammatical_gender, content, facts_hash, prompt_version, kb_version, model, status, created_at)
         values ($8, $1, 'full_section', $2, 0, $3, $4, $5, $9, $10, $6, $7, 'fallback', 'fallback', $11)
         returning content, status, created_at`,
        [...cacheParams, user.uid, JSON.stringify(written.value), shortHash(written.value.anchors.join('|')), now])).rows[0];
      if (!row) throw new Error('section non écrite');
      return row;
    });
    return { status: stored.created_at.getTime() === now.getTime() ? 201 : 200, body: respond(stored) };
  },
});
