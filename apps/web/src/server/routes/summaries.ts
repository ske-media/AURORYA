// GET /charts/current/summaries?mode= (SPEC §7.2, feuille de placement). Le résumé de chaque placement du thème
// courant, dans le mode demandé : le champ `summary` de la base de règles, sans LLM. Gratuit.
import { chartFacts } from '@aurorya/ai';
import { type ChartSummaries, ChartPayloadSchema, type Locale, TONE_MODES } from '@aurorya/shared';
import { z } from 'zod';
import { ApiFailure, defineRoute } from '../http';
import { configValue } from '../remote-config';
import { loadKb } from './roasts';

export const getChartSummaries = defineRoute({
  name: 'GET /charts/current/summaries',
  auth: 'required',
  rateLimit: { configKey: 'limits.default_per_hour', fallback: 300, windowSeconds: 3600 },
  handler: async ({ deps, user, query }): Promise<{ body: ChartSummaries }> => {
    const mode = z.enum(TONE_MODES).safeParse(query.get('mode'));
    if (!mode.success) throw new ApiFailure('VALIDATION_FAILED', 'entrée invalide', { fields: ['mode'] });
    const now = deps.now();
    const owner = (await deps.sql.query<{ id: string; payload: unknown; locale: Locale }>(
      `select c.id, c.payload, p.locale from public.charts c join public.profiles p on p.id = c.user_id where c.user_id = $1 and c.is_current`, [user.uid])).rows[0];
    if (!owner) throw new ApiFailure('NOT_FOUND', 'thème introuvable');
    const englishEnabled = await configValue(deps.sql, now, 'flags.locale_en_enabled', z.boolean(), false);
    const locale: Locale = englishEnabled ? owner.locale : 'fr';
    const kbVersion = await configValue(deps.sql, now, 'content.kb_version', z.string(), '1');
    // Seuls les placements et les angles ont une feuille ; un signe incertain (Lune sans heure) n'en a pas.
    const facts = chartFacts(ChartPayloadSchema.parse(owner.payload)).filter((f) => f.kind === 'placement' || f.kind === 'angle');
    const kb = await loadKb(deps, locale, kbVersion, [...new Set(facts.map((f) => f.kbKey))]);
    const summaries: Record<string, string> = {};
    for (const fact of facts) {
      const entry = kb(fact.kbKey);
      if (entry) summaries[fact.factId] = entry.summary[mode.data];
    }
    return { body: { chartId: owner.id, mode: mode.data, summaries } };
  },
});
