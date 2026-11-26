// POST /groups/{id}/readings (SPEC §7.6, §13.4, §14.6). Rôles et duos sont attribués par le code, de façon
// déterministe ; seuls les textes viennent du LLM. Sans fournisseur d'IA, la structure est renvoyée seule.
import { assignRoles, pickDuos } from '@aurorya/ai';
import { computeSynastry } from '@aurorya/astro-engine';
import { ChartPayloadSchema, type GrammaticalGender, type GroupReading, type GroupType, PostGroupReadingInputSchema } from '@aurorya/shared';
import { ApiFailure, defineRoute, isPremium } from '../http';

type MemberRow = { user_id: string; display_name: string; grammatical_gender: GrammaticalGender; payload: unknown };

export const postGroupReadings = defineRoute({
  name: 'POST /groups/{id}/readings', auth: 'required', input: PostGroupReadingInputSchema,
  rateLimit: { configKey: 'limits.group_readings_per_hour', fallback: 30, windowSeconds: 3600 },
  handler: async ({ deps, user, input, params, locale }) => {
    const id = params.id ?? '';
    const group = /^[0-9a-f-]{36}$/i.test(id) ? (await deps.sql.query<{ type: GroupType }>('select type from public.groups where id = $1', [id])).rows[0] : undefined;
    const members = group
      ? (await deps.sql.query<MemberRow>(
          `select m.user_id, m.display_name, m.grammatical_gender, c.payload from public.group_members m join public.charts c on c.id = m.chart_id
           where m.group_id = $1 order by m.joined_at, m.user_id`, [id])).rows
      : [];
    if (!group || !members.some((m) => m.user_id === user.uid)) throw new ApiFailure('NOT_FOUND', 'groupe introuvable');
    const premium = await isPremium(deps, user.uid);
    if (input.kind === 'weekly_weather') {
      if (!premium) throw new ApiFailure('PREMIUM_REQUIRED', 'météo du groupe réservée au Premium');
      throw new ApiFailure('GENERATION_UNAVAILABLE', 'météo du groupe indisponible');
    }
    if (members.length < 2) throw new ApiFailure('CONFLICT', 'au moins deux membres sont nécessaires', { reason: 'not_enough_members' });

    const roles = deps.roleCatalog.types[group.type];
    // Un type dont les libellés ne sont pas encore rédigés ne peut pas être affiché.
    if (roles.some((r) => r.labels[locale] === null && r.labels.fr === null)) throw new ApiFailure('GENERATION_UNAVAILABLE', 'rôles de ce type de groupe pas encore rédigés');
    const charts = members.map((m) => ChartPayloadSchema.parse(m.payload));
    const assigned = assignRoles(charts, roles);

    const pairs = [];
    for (let a = 0; a < charts.length; a += 1) {
      for (let b = a + 1; b < charts.length; b += 1) {
        const [ca, cb] = [charts[a], charts[b]];
        if (!ca || !cb) continue;
        const synastry = computeSynastry(ca, cb, deps.engineConfig);
        pairs.push({ a, b, harmony: synastry.harmony, tension: synastry.tension });
      }
    }
    const duos = pickDuos(pairs);
    const uid = (index: number): string => members[index]?.user_id ?? '';
    const body: GroupReading = {
      kind: 'roles_duos',
      // Sans LLM, chaque rôle et chaque duo porte sa phrase de repli du catalogue ; le détail attend la génération.
      status: 'fallback',
      roles: assigned.map((r) => {
        const member = members[r.memberIndex];
        const role = roles.find((x) => x.id === r.roleId);
        const labels = role?.labels[locale] ?? role?.labels.fr;
        return {
          userId: member?.user_id ?? '', displayName: member?.display_name ?? '', roleId: r.roleId,
          label: labels?.[member?.grammatical_gender ?? 'n'] ?? r.roleId, line: role?.fallbackLine?.[input.mode] ?? null, detail: null, locked: !premium,
        };
      }),
      // Les scores de synastrie ne servent qu'à choisir les duos : ils ne sortent jamais du serveur (SPEC §11.7).
      duos: [
        { kind: 'duo_fusion', a: uid(duos.fusion.a), b: uid(duos.fusion.b), title: null, line: deps.roleCatalog.duos.duo_fusion.fallbackLine[input.mode], detail: null, locked: !premium },
        { kind: 'duo_sparks', a: uid(duos.sparks.a), b: uid(duos.sparks.b), title: null, line: deps.roleCatalog.duos.duo_sparks.fallbackLine[input.mode], detail: null, locked: !premium },
      ],
    };
    return { body };
  },
});
