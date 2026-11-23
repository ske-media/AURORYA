// Export et suppression du compte (SPEC §13.5, §21.4, §21.5).
import { z } from 'zod';
import { ApiFailure, defineRoute } from '../http';
import { removeMember } from './groups';

/** Portabilité : tout ce que le service détient sur la personne, en un fichier JSON. Une demande par jour. */
export const postAccountExport = defineRoute({
  name: 'POST /account/export', auth: 'required',
  rateLimit: { configKey: 'limits.account_export_per_day', fallback: 1, windowSeconds: 86_400 },
  handler: async ({ deps, user }) => {
    const { sql } = deps;
    const one = async (text: string) => (await sql.query(text, [user.uid])).rows[0] ?? null;
    const many = async (text: string) => (await sql.query(text, [user.uid])).rows;
    return {
      body: {
        exportedAt: deps.now().toISOString(),
        profile: await one('select first_name, grammatical_gender, locale, tz, tone_mode_default, interests, astro_level, notif_enabled, notif_time, sounds_enabled, haptics_enabled, analytics_consent, created_at from public.profiles where id = $1'),
        birthData: await one('select birth_date, birth_time, time_precision, time_window, place_label, country_code, latitude, longitude, tz_iana from public.birth_data where user_id = $1'),
        charts: await many('select id, payload, is_current, computed_at from public.charts where user_id = $1 order by computed_at'),
        readings: await many('select kind, section_key, local_date, variant, mode, locale, content, status, created_at from public.readings where user_id = $1 order by created_at'),
        groups: await many('select g.name, g.type, m.display_name, m.joined_at, (g.owner_id = m.user_id) as is_owner from public.group_members m join public.groups g on g.id = m.group_id where m.user_id = $1 order by m.joined_at'),
        consents: await many('select kind, granted, version, context, created_at from public.consents where user_id = $1 order by created_at'),
        entitlement: await one('select is_premium, product_id, period_type, expires_at, will_renew, is_founder from public.entitlements where user_id = $1'),
      },
    };
  },
});

/** Suppression complète, dans l'ordre du §21.5, reprenable : chaque étape peut être rejouée sans dommage. */
export const deleteAccount = defineRoute({
  name: 'DELETE /account', auth: 'required', input: z.strictObject({ confirm: z.literal('DELETE') }),
  rateLimit: { configKey: 'limits.default_per_hour', fallback: 300, windowSeconds: 3600 },
  handler: async ({ deps, user }) => {
    const { sql } = deps;
    // 1. Quitter tous les groupes, avec transfert de propriété ou suppression selon les règles du §7.6.
    const memberships = (await sql.query<{ group_id: string; owner_id: string }>(
      'select m.group_id, g.owner_id from public.group_members m join public.groups g on g.id = m.group_id where m.user_id = $1', [user.uid])).rows;
    for (const membership of memberships) await removeMember(sql, membership.group_id, user.uid, membership.owner_id);
    // 2. Supprimer l'utilisateur : les cascades emportent profil, naissance, thèmes, lectures, droit, jetons, consentements.
    try {
      await deps.deleteAuthUser(user.uid);
    } catch {
      throw new ApiFailure('INTERNAL', 'suppression du compte interrompue');
    }
    // 3. Anonymiser les traces de coût, conservées sans lien avec la personne.
    await sql.query('update public.ai_usage set user_id = null where user_id = $1', [user.uid]);
    // 4. Suppression chez RevenueCat et Mixpanel : à brancher avec ces services (T-060, T-062).
    return { status: 204, body: null };
  },
});
