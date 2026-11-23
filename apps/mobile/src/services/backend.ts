// Accès au serveur : session Supabase (anonyme d'abord, A-003), lectures directes sous RLS,
// écritures par l'API uniquement (A-002).
import {
  ChartSummarySchema, DailyResponseSchema, GroupReadingSchema, GroupSchema, type GroupType, InviteCreatedSchema, InvitePreviewSchema, type PostChartsInput, type ToneMode, type PostRoastsInput, ProfileSchema, type PutProfileInput, RoastResponseSchema,
} from '@aurorya/shared';
import { type SupabaseClient, createClient } from '@supabase/supabase-js';
import * as Application from 'expo-application';
import { randomUUID } from 'expo-crypto';
import i18n from 'i18next';
import { type ApiClient, createApiClient } from './api-client';
import { type AppEnv, readEnv } from './env';
import { secureStorage } from './secure-storage';

export type Backend = Readonly<{ supabase: SupabaseClient; api: ApiClient; env: AppEnv }>;
let backend: Backend | null | undefined;

/** Null si l'app n'est pas configurée (variables d'environnement absentes). */
export function getBackend(): Backend | null {
  if (backend !== undefined) return backend;
  const env = readEnv();
  if (!env) return (backend = null);
  const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: { storage: secureStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
  });
  const api = createApiClient({
    baseUrl: `${env.apiBaseUrl}/api/v1`,
    appVersion: Application.nativeApplicationVersion ?? '0.0.0',
    appBuild: Application.nativeBuildVersion ?? '1',
    getToken: async () => (await supabase.auth.getSession()).data.session?.access_token ?? null,
    getLocale: () => (i18n.language === 'en' ? 'en' : 'fr'),
    newRequestId: randomUUID,
  });
  return (backend = { supabase, api, env });
}

/** Ouvre une session anonyme au premier lancement ; l'identifiant ne changera pas à la création du compte. */
export async function ensureSession(b: Backend): Promise<void> {
  const { data } = await b.supabase.auth.getSession();
  if (data.session) return;
  const { error } = await b.supabase.auth.signInAnonymously();
  if (error) throw error;
}

export type PlaceResult = Readonly<{ geonameId: number; name: string; admin1Name: string | null; countryCode: string }>;

export const endpoints = (b: Backend) => ({
  putProfile: (input: PutProfileInput) => b.api.request({ method: 'PUT', path: '/profile', body: input, output: ProfileSchema }),
  postCharts: (input: PostChartsInput) => b.api.request({ method: 'POST', path: '/charts', body: input, output: ChartSummarySchema, idempotencyKey: randomUUID() }),
  postRoasts: (input: Pick<PostRoastsInput, 'chartId' | 'mode'>) => b.api.request({ method: 'POST', path: '/roasts', body: { ...input, regenerate: false }, output: RoastResponseSchema }),
  getDaily: (date: string, mode: ToneMode) => b.api.request({ method: 'GET', path: `/daily?date=${date}&mode=${mode}`, output: DailyResponseSchema }),
  exportAccount: () => b.api.request({ method: 'POST', path: '/account/export', output: null }),
  deleteAccount: () => b.api.request({ method: 'DELETE', path: '/account', body: { confirm: 'DELETE' }, output: null }),
  postGroups: (name: string, type: GroupType) => b.api.request({ method: 'POST', path: '/groups', body: { name, type }, output: GroupSchema, idempotencyKey: randomUUID() }),
  postGroupInvite: (groupId: string) => b.api.request({ method: 'POST', path: `/groups/${groupId}/invites`, output: InviteCreatedSchema }),
  resolveInvite: (code: string) => b.api.request({ method: 'POST', path: '/invites/resolve', body: { code }, output: InvitePreviewSchema }),
  joinGroup: (input: { code?: string; token?: string; displayName: string; consentVersion: string }) =>
    b.api.request({ method: 'POST', path: '/groups/join', body: { ...input, consentGroupShare: true }, output: GroupSchema }),
  leaveGroup: (groupId: string) => b.api.request({ method: 'POST', path: `/groups/${groupId}/leave`, output: null }),
  postGroupReading: (groupId: string, mode: ToneMode) => b.api.request({ method: 'POST', path: `/groups/${groupId}/readings`, body: { kind: 'roles_duos', mode }, output: GroupReadingSchema }),
  /** Lecture directe sous RLS : aucune donnée de naissance ne part chez un tiers (A-007). */
  searchPlaces: async (query: string, locale: 'fr' | 'en'): Promise<PlaceResult[]> => {
    const { data, error } = await b.supabase.rpc('search_places', { q: query, lang: locale, max_results: 8 });
    if (error) throw error;
    return ((data ?? []) as { geoname_id: number; name: string; admin1_name: string | null; country_code: string }[]).map((r) => ({
      geonameId: Number(r.geoname_id), name: r.name, admin1Name: r.admin1_name, countryCode: r.country_code,
    }));
  },
});
