// Droit Premium tenu par le serveur (SPEC §18.3). L'état vient toujours de la fiche cliente de RevenueCat
// (`GET /v1/subscribers/{app_user_id}`), que ce soit après un webhook ou au rattrapage : un seul format à lire,
// comme le recommande la documentation de RevenueCat (« Syncing Subscription Status »).
import { type EntitlementState, PRODUCT_IDS } from '@aurorya/shared';
import { z } from 'zod';
import type { Sql } from './deps';

const ENTITLEMENT_ID = 'premium';
const isoDate = z.string().nullable().optional();

/** Champs lus dans la fiche cliente (REST v1, « Customer Info Model »). Le reste de la réponse est ignoré. */
export const SubscriberResponseSchema = z.object({
  subscriber: z.object({
    entitlements: z.record(z.string(), z.object({ expires_date: isoDate, grace_period_expires_date: isoDate, product_identifier: z.string() })).default({}),
    subscriptions: z.record(z.string(), z.object({
      period_type: z.string().optional(), unsubscribe_detected_at: isoDate, billing_issues_detected_at: isoDate, refunded_at: isoDate,
    })).default({}),
  }),
});
export type SubscriberResponse = z.infer<typeof SubscriberResponseSchema>;

const NONE: EntitlementState = { premium: false, productId: null, periodType: null, expiresAt: null, willRenew: null, isFounder: false };
const PERIOD_TYPES = ['trial', 'intro', 'normal'] as const;
const toIso = (value: string | null | undefined): string | null => (value ? new Date(value).toISOString() : null);

/** État du droit d'après la fiche cliente, à l'instant `now`. Fonction pure. */
export function entitlementFromSubscriber(response: SubscriberResponse, now: Date): EntitlementState {
  const entitlement = response.subscriber.entitlements[ENTITLEMENT_ID];
  if (!entitlement) return NONE;
  const subscription = response.subscriber.subscriptions[entitlement.product_identifier];
  // Pendant le délai de grâce accordé par le magasin, l'accès reste ouvert.
  const ends = [entitlement.expires_date, entitlement.grace_period_expires_date].map((d) => (d ? Date.parse(d) : null));
  const lifetime = entitlement.expires_date === null || entitlement.expires_date === undefined;
  const lastEnd = Math.max(...ends.filter((d): d is number => d !== null), Number.NEGATIVE_INFINITY);
  const active = !subscription?.refunded_at && (lifetime || lastEnd > now.getTime());
  const period = PERIOD_TYPES.find((p) => p === subscription?.period_type) ?? null;
  return {
    premium: active,
    productId: entitlement.product_identifier,
    periodType: period,
    expiresAt: lifetime ? null : new Date(lastEnd).toISOString(),
    willRenew: subscription ? !subscription.unsubscribe_detected_at && !subscription.billing_issues_detected_at : null,
    isFounder: entitlement.product_identifier === PRODUCT_IDS.founder,
  };
}

/**
 * Écrit l'état dans `entitlements`, seulement s'il est plus récent que le dernier appliqué (`rc_event_at`).
 * Renvoie faux si la ligne existante est plus récente, ou si l'identifiant n'est pas une utilisatrice connue.
 */
export async function applyEntitlement(sql: Sql, uid: string, state: EntitlementState, eventAt: Date): Promise<boolean> {
  const { rowCount } = await sql.query(
    `insert into public.entitlements (user_id, is_premium, product_id, period_type, expires_at, will_renew, is_founder, rc_event_at, updated_at)
     select p.id, $2, $3, $4, $5, $6, $7, $8, now() from public.profiles p where p.id = $1
     on conflict (user_id) do update set is_premium = excluded.is_premium, product_id = excluded.product_id, period_type = excluded.period_type,
       expires_at = excluded.expires_at, will_renew = excluded.will_renew, is_founder = excluded.is_founder, rc_event_at = excluded.rc_event_at, updated_at = now()
     where public.entitlements.rc_event_at < excluded.rc_event_at`,
    [uid, state.premium, state.productId, state.periodType, state.expiresAt, state.willRenew, state.isFounder, eventAt]);
  return rowCount > 0;
}

export const readEntitlement = async (sql: Sql, uid: string, now: Date): Promise<EntitlementState> => {
  const row = (await sql.query<{ is_premium: boolean; product_id: string | null; period_type: EntitlementState['periodType']; expires_at: Date | string | null; will_renew: boolean | null; is_founder: boolean }>(
    'select is_premium, product_id, period_type, expires_at, will_renew, is_founder from public.entitlements where user_id = $1', [uid])).rows[0];
  if (!row) return NONE;
  const expiresAt = toIso(row.expires_at === null ? null : new Date(row.expires_at).toISOString());
  return {
    premium: row.is_premium && (expiresAt === null || Date.parse(expiresAt) > now.getTime()),
    productId: row.product_id, periodType: row.period_type, expiresAt, willRenew: row.will_renew, isFounder: row.is_founder,
  };
};

/** Client de l'API REST v1 de RevenueCat, avec la clé secrète (côté serveur uniquement). */
export const createRevenueCatClient = (secretKey: string, fetcher: typeof fetch = fetch) => ({
  fetchSubscriber: async (uid: string): Promise<SubscriberResponse> => {
    const response = await fetcher(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(uid)}`, {
      headers: { authorization: `Bearer ${secretKey}`, accept: 'application/json' }, signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error(`RevenueCat a répondu ${response.status}`);
    return SubscriberResponseSchema.parse(await response.json());
  },
});
export type RevenueCatPort = ReturnType<typeof createRevenueCatClient>;
