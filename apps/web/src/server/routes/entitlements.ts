// POST /entitlements/refresh et POST /webhooks/revenuecat (SPEC §13.3, §18.3). Le serveur reste seul juge du droit.
import { timingSafeEqual } from 'node:crypto';
import type { EntitlementState } from '@aurorya/shared';
import { z } from 'zod';
import type { AppDeps } from '../deps';
import { applyEntitlement, entitlementFromSubscriber, readEntitlement } from '../entitlements';
import { ApiFailure, defineRoute } from '../http';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Relit la fiche cliente chez RevenueCat et met la table à jour. */
async function syncFromRevenueCat(deps: AppDeps, uid: string, eventAt: Date): Promise<void> {
  if (!deps.revenueCat) throw new Error('RevenueCat non configuré');
  await applyEntitlement(deps.sql, uid, entitlementFromSubscriber(await deps.revenueCat.fetchSubscriber(uid), deps.now()), eventAt);
}

export const postEntitlementsRefresh = defineRoute({
  name: 'POST /entitlements/refresh',
  auth: 'required',
  rateLimit: { configKey: 'limits.entitlement_refresh_per_hour', fallback: 10, windowSeconds: 3600 },
  handler: async ({ deps, user }): Promise<{ body: EntitlementState }> => {
    // Sans RevenueCat configuré, la table reste la vérité : on la renvoie telle quelle, sans rien inventer.
    if (deps.revenueCat) {
      try {
        await syncFromRevenueCat(deps, user.uid, deps.now());
      } catch {
        throw new ApiFailure('GENERATION_UNAVAILABLE', 'vérification du droit indisponible');
      }
    }
    return { body: await readEntitlement(deps.sql, user.uid, deps.now()) };
  },
});

// Champs lus dans l'événement (documentation RevenueCat, « Event Types and Fields »). Le reste est conservé tel quel.
const WebhookSchema = z.object({
  event: z.object({
    id: z.string().min(1).max(200),
    type: z.string().min(1).max(80),
    event_timestamp_ms: z.number().int().positive(),
    app_user_id: z.string().optional(),
    original_app_user_id: z.string().optional(),
    aliases: z.array(z.string()).optional(),
    transferred_from: z.array(z.string()).optional(),
    transferred_to: z.array(z.string()).optional(),
  }).passthrough(),
}).passthrough();

const MAX_WEBHOOK_BYTES = 256 * 1024;
const reply = (status: number): Response => new Response(null, { status });

const sameSecret = (received: string, expected: string): boolean => {
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
};

/**
 * Webhook RevenueCat. L'en-tête d'autorisation configuré dans RevenueCat vaut `Bearer <REVENUECAT_WEBHOOK_SECRET>`.
 * 200 dès que l'événement est appliqué ou déjà connu ; toute erreur renvoie 5xx pour que RevenueCat réessaie.
 */
export async function postRevenueCatWebhook(request: Request, deps: AppDeps): Promise<Response> {
  const log = (status: number, extra: Record<string, unknown> = {}): Response => {
    deps.logger.info('requête', { route: 'POST /webhooks/revenuecat', method: 'POST', status, ...extra });
    return reply(status);
  };
  if (!deps.revenueCatWebhookSecret || !deps.revenueCat) return log(503, { errorCode: 'NOT_CONFIGURED' });
  if (!sameSecret(request.headers.get('authorization') ?? '', `Bearer ${deps.revenueCatWebhookSecret}`)) return log(401, { errorCode: 'UNAUTHENTICATED' });

  const raw = await request.text();
  if (Buffer.byteLength(raw) > MAX_WEBHOOK_BYTES) return log(413);
  let parsed: z.infer<typeof WebhookSchema>;
  try {
    parsed = WebhookSchema.parse(JSON.parse(raw));
  } catch {
    return log(400, { errorCode: 'VALIDATION_FAILED' });
  }
  const { event } = parsed;
  const eventAt = new Date(event.event_timestamp_ms);
  // Les attributs d'abonnée ne sont pas conservés : rien de personnel ne doit dormir dans ce journal.
  const stored = Object.fromEntries(Object.entries(event).filter(([key]) => key !== 'subscriber_attributes'));
  const candidates = [event.app_user_id, event.original_app_user_id, ...(event.aliases ?? []), ...(event.transferred_from ?? []), ...(event.transferred_to ?? [])];
  const uids = [...new Set(candidates.filter((id): id is string => typeof id === 'string' && UUID.test(id)).map((id) => id.toLowerCase()))];

  try {
    await deps.sql.query(
      `insert into public.rc_webhook_events (event_id, type, app_user_id, event_at, payload) values ($1, $2, $3, $4, $5) on conflict (event_id) do nothing`,
      [event.id, event.type, event.app_user_id ?? event.transferred_to?.[0] ?? '', eventAt, JSON.stringify(stored)]);
    const seen = (await deps.sql.query<{ done: boolean }>('select processed_at is not null as done from public.rc_webhook_events where event_id = $1', [event.id])).rows[0];
    // Déjà traité : une nouvelle livraison du même événement ne change rien.
    if (seen?.done) return log(200, { eventType: event.type, duplicate: true });
    // Un transfert touche l'ancienne et la nouvelle propriétaire : les deux sont relues.
    for (const uid of uids) await syncFromRevenueCat(deps, uid, eventAt);
    await deps.sql.query('update public.rc_webhook_events set processed_at = $2 where event_id = $1', [event.id, deps.now()]);
    return log(200, { eventType: event.type, users: uids.length });
  } catch {
    deps.logger.error('erreur interne', { route: 'POST /webhooks/revenuecat', errorCode: 'INTERNAL', eventType: event.type });
    return reply(500);
  }
}
