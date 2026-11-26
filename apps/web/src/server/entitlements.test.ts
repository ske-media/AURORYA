// Droit Premium (SPEC §18.3) : lecture de la fiche RevenueCat, rattrapage, webhook idempotent et ordonné.
import { RoleCatalogSchema } from '@aurorya/ai';
import { DEFAULT_ENGINE_CONFIG } from '@aurorya/astro-engine';
import { EntitlementStateSchema, PRODUCT_IDS } from '@aurorya/shared';
import { afterAll, beforeAll, beforeEach, describe, expect, inject, it } from 'vitest';
import rolesJson from '../../../../content/roles/roles.v1.json';
import type { AppDeps } from './deps';
import { type SubscriberResponse, entitlementFromSubscriber } from './entitlements';
import { isPremium } from './http';
import { createLogger } from './log';
import { createNameFilter } from './names';
import { createPgSql } from './pg-sql';
import { invalidateConfigCache } from './remote-config';
import { postEntitlementsRefresh, postRevenueCatWebhook } from './routes/entitlements';

const pg = inject('pg');
const { sql, close } = createPgSql({ host: pg.host, port: pg.port, user: 'postgres', database: 'postgres' });
const UID = '00000000-0000-4000-8000-0000000000e1';
const OTHER = '00000000-0000-4000-8000-0000000000e2';
const SECRET = 'secret-de-test';
const now = new Date('2026-11-26T10:00:00Z');
const logged: unknown[] = [];

const subscriber = (over: { expires?: string | null; product?: string; period?: string; unsubscribed?: string | null; refunded?: string | null; grace?: string | null } = {}): SubscriberResponse => {
  const product = over.product ?? PRODUCT_IDS.annual;
  return { subscriber: {
    entitlements: { premium: { expires_date: over.expires === undefined ? '2026-12-03T10:00:00Z' : over.expires, grace_period_expires_date: over.grace ?? null, product_identifier: product } },
    subscriptions: { [product]: { period_type: over.period ?? 'trial', unsubscribe_detected_at: over.unsubscribed ?? null, billing_issues_detected_at: null, refunded_at: over.refunded ?? null } },
  } };
};
const NO_PURCHASE: SubscriberResponse = { subscriber: { entitlements: {}, subscriptions: {} } };
let remote: Record<string, SubscriberResponse> = {};
let calls: string[] = [];
let failing = false;

const deps: AppDeps = {
  sql, auth: { verify: async (t) => (t === 'ok' ? { uid: UID, isAnonymous: true } : null) }, logger: createLogger((line) => void logged.push(line)), now: () => now, llm: null,
  prompts: {} as AppDeps['prompts'], engineConfig: DEFAULT_ENGINE_CONFIG, roleCatalog: RoleCatalogSchema.parse(rolesJson), deleteAuthUser: async () => undefined, publicSiteUrl: null, nameFilter: createNameFilter([]),
  revenueCat: { fetchSubscriber: async (uid) => { calls.push(uid); if (failing) throw new Error('panne'); return remote[uid] ?? NO_PURCHASE; } },
  revenueCatWebhookSecret: SECRET,
};
const refresh = (d: AppDeps = deps) => postEntitlementsRefresh(new Request('https://test.invalid/api/v1/entitlements/refresh', { method: 'POST', headers: { authorization: 'Bearer ok' } }), d);
const hook = (event: Record<string, unknown>, authorization: string | null = `Bearer ${SECRET}`, d: AppDeps = deps) =>
  postRevenueCatWebhook(new Request('https://test.invalid/api/v1/webhooks/revenuecat', { method: 'POST', headers: authorization ? { authorization } : {}, body: JSON.stringify({ api_version: '1.0', event }) }), d);
const event = (id: string, at: string, over: Record<string, unknown> = {}) => ({ id, type: 'INITIAL_PURCHASE', event_timestamp_ms: Date.parse(at), app_user_id: UID, original_app_user_id: UID, aliases: [UID], ...over });
const row = async (uid = UID) => (await sql.query('select is_premium, product_id, period_type, will_renew, is_founder from public.entitlements where user_id = $1', [uid])).rows[0];

beforeAll(async () => {
  for (const uid of [UID, OTHER]) {
    await sql.query('insert into auth.users (id, is_anonymous) values ($1, true)', [uid]);
    await sql.query(`insert into public.profiles (id, first_name, grammatical_gender) values ($1, 'Test', 'f')`, [uid]);
  }
});
afterAll(close);
beforeEach(async () => {
  await sql.query('truncate public.rate_limits');
  await sql.query('delete from public.entitlements where user_id = any($1)', [[UID, OTHER]]);
  await sql.query(`delete from public.rc_webhook_events where event_id like 'evt-%'`);
  invalidateConfigCache(sql);
  remote = {}; calls = []; failing = false; logged.length = 0;
});

describe('lecture de la fiche RevenueCat', () => {
  it('ouvre le droit pendant un essai en cours, avec renouvellement prévu', () => {
    expect(entitlementFromSubscriber(subscriber(), now)).toEqual({ premium: true, productId: PRODUCT_IDS.annual, periodType: 'trial', expiresAt: '2026-12-03T10:00:00.000Z', willRenew: true, isFounder: false });
  });
  it('garde le droit jusqu’à l’échéance après une résiliation, puis le ferme', () => {
    const cancelled = subscriber({ unsubscribed: '2026-11-25T10:00:00Z', period: 'normal' });
    expect(entitlementFromSubscriber(cancelled, now)).toMatchObject({ premium: true, willRenew: false });
    expect(entitlementFromSubscriber(cancelled, new Date('2026-12-04T00:00:00Z')).premium).toBe(false);
  });
  it('ferme le droit sur un remboursement, l’ouvre pendant le délai de grâce', () => {
    expect(entitlementFromSubscriber(subscriber({ refunded: '2026-11-25T10:00:00Z' }), now).premium).toBe(false);
    expect(entitlementFromSubscriber(subscriber({ expires: '2026-11-25T10:00:00Z', grace: '2026-11-30T10:00:00Z' }), now).premium).toBe(true);
  });
  it('reconnaît l’offre fondatrice, et l’absence d’achat', () => {
    expect(entitlementFromSubscriber(subscriber({ product: PRODUCT_IDS.founder }), now).isFounder).toBe(true);
    expect(entitlementFromSubscriber(NO_PURCHASE, now)).toMatchObject({ premium: false, productId: null });
  });
  it('ignore un type de période inconnu de la base', () => {
    expect(entitlementFromSubscriber(subscriber({ period: 'promotional' }), now).periodType).toBeNull();
  });
});

describe('POST /entitlements/refresh', () => {
  it('exige une session', async () => {
    expect((await postEntitlementsRefresh(new Request('https://test.invalid/x', { method: 'POST' }), deps)).status).toBe(401);
  });
  it('relit RevenueCat, écrit la table et ouvre le droit côté serveur', async () => {
    remote[UID] = subscriber();
    const response = await refresh();
    expect(response.status).toBe(200);
    expect(EntitlementStateSchema.parse(await response.json())).toMatchObject({ premium: true, periodType: 'trial' });
    expect(await isPremium(deps, UID)).toBe(true);
  });
  it('sans achat, n’ouvre rien', async () => {
    expect(EntitlementStateSchema.parse(await (await refresh()).json()).premium).toBe(false);
    expect(await isPremium(deps, UID)).toBe(false);
  });
  it('sans RevenueCat configuré, renvoie l’état de la table sans appel', async () => {
    const response = await refresh({ ...deps, revenueCat: null });
    expect(EntitlementStateSchema.parse(await response.json()).premium).toBe(false);
    expect(calls).toEqual([]);
  });
  it('répond 503 si RevenueCat est en panne, sans toucher la table', async () => {
    failing = true;
    expect((await refresh()).status).toBe(503);
    expect(await row()).toBeUndefined();
  });
  it('est limitée à dix appels par heure', async () => {
    for (let i = 0; i < 10; i += 1) expect((await refresh()).status).toBe(200);
    expect((await refresh()).status).toBe(429);
  });
});

describe('POST /webhooks/revenuecat', () => {
  it('refuse un secret absent ou faux, et répond 503 sans configuration', async () => {
    expect((await hook(event('evt-1', '2026-11-26T09:00:00Z'), null)).status).toBe(401);
    expect((await hook(event('evt-1', '2026-11-26T09:00:00Z'), 'Bearer autre')).status).toBe(401);
    expect((await hook(event('evt-1', '2026-11-26T09:00:00Z'), `Bearer ${SECRET}`, { ...deps, revenueCatWebhookSecret: null })).status).toBe(503);
    expect(calls).toEqual([]);
  });
  it('refuse un corps mal formé', async () => {
    expect((await hook({ type: 'INITIAL_PURCHASE' })).status).toBe(400);
  });
  it('applique un achat', async () => {
    remote[UID] = subscriber();
    expect((await hook(event('evt-2', '2026-11-26T09:00:00Z'))).status).toBe(200);
    expect(await row()).toMatchObject({ is_premium: true, product_id: PRODUCT_IDS.annual, period_type: 'trial', will_renew: true });
  });
  it('ignore un événement déjà traité', async () => {
    remote[UID] = subscriber();
    await hook(event('evt-3', '2026-11-26T09:00:00Z'));
    remote[UID] = NO_PURCHASE;
    expect((await hook(event('evt-3', '2026-11-26T09:00:00Z'))).status).toBe(200);
    expect(calls).toHaveLength(1);
    expect((await row())?.is_premium).toBe(true);
  });
  it('n’applique pas un événement plus ancien que le dernier appliqué', async () => {
    remote[UID] = subscriber();
    await hook(event('evt-4', '2026-11-26T09:00:00Z'));
    remote[UID] = NO_PURCHASE;
    await hook(event('evt-5', '2026-11-26T08:00:00Z', { type: 'EXPIRATION' }));
    expect((await row())?.is_premium).toBe(true);
    await hook(event('evt-6', '2026-11-26T09:30:00Z', { type: 'EXPIRATION' }));
    expect((await row())?.is_premium).toBe(false);
  });
  it('sur un transfert, relit l’ancienne et la nouvelle propriétaire', async () => {
    remote[UID] = subscriber();
    await hook(event('evt-7', '2026-11-26T09:00:00Z'));
    remote[UID] = NO_PURCHASE;
    remote[OTHER] = subscriber({ period: 'normal' });
    const transfer = { id: 'evt-8', type: 'TRANSFER', event_timestamp_ms: Date.parse('2026-11-26T09:40:00Z'), transferred_from: [UID], transferred_to: [OTHER] };
    expect((await hook(transfer)).status).toBe(200);
    expect((await row(UID))?.is_premium).toBe(false);
    expect((await row(OTHER))?.is_premium).toBe(true);
  });
  it('n’écrit rien pour une utilisatrice sans profil', async () => {
    const ghost = '00000000-0000-4000-8000-0000000000e9';
    remote[ghost] = subscriber();
    expect((await hook(event('evt-12', '2026-11-26T09:00:00Z', { app_user_id: ghost, original_app_user_id: ghost, aliases: [] }))).status).toBe(200);
    expect(await row(ghost)).toBeUndefined();
  });
  it('accepte un événement de test ou d’une inconnue sans rien écrire', async () => {
    expect((await hook(event('evt-9', '2026-11-26T09:00:00Z', { type: 'TEST', app_user_id: 'inconnue', original_app_user_id: 'inconnue', aliases: [] }))).status).toBe(200);
    expect(calls).toEqual([]);
  });
  it('répond 500 si RevenueCat est en panne, puis rejoue l’événement à la livraison suivante', async () => {
    remote[UID] = subscriber();
    failing = true;
    expect((await hook(event('evt-10', '2026-11-26T09:00:00Z'))).status).toBe(500);
    failing = false;
    expect((await hook(event('evt-10', '2026-11-26T09:00:00Z'))).status).toBe(200);
    expect((await row())?.is_premium).toBe(true);
  });
  it('ne garde pas les attributs d’abonnée et ne journalise aucun identifiant', async () => {
    await hook(event('evt-11', '2026-11-26T09:00:00Z', { subscriber_attributes: { $email: { value: 'x@test.invalid' } } }));
    const stored = (await sql.query<{ payload: Record<string, unknown> }>(`select payload from public.rc_webhook_events where event_id = 'evt-11'`)).rows[0];
    expect(stored?.payload).not.toHaveProperty('subscriber_attributes');
    expect(JSON.stringify(logged)).not.toContain(UID);
  });
});
