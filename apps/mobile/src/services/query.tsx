// État serveur (SPEC §15.2) : TanStack Query, clés centralisées.
import { type ChartPayload, ChartPayloadSchema, type ChartSummaries, type DailyResponse, type SectionKey, type SectionResponse, type ToneMode } from '@aurorya/shared';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { type ReactNode, useEffect } from 'react';
import { AppState } from 'react-native';
import { endpoints, ensureSession, getBackend } from './backend';
import { type Offers, loadOffers, purchasesEnabled } from './purchases';

export const queryKeys = {
  currentChart: ['chart', 'current'] as const,
  section: (key: SectionKey, mode: ToneMode) => ['reading', 'section', key, mode] as const,
  summaries: (chartId: string, mode: ToneMode) => ['chart', 'summaries', chartId, mode] as const,
  daily: (date: string, mode: ToneMode) => ['daily', date, mode] as const,
  entitlement: ['entitlement'] as const,
  offers: ['offers'] as const,
};

const client = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 5 * 60_000 } } });
export function QueryProvider({ children }: { children: ReactNode }) {
  // Au retour au premier plan, le droit est relu : un abonnement géré dans les réglages d'Apple a pu changer.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void client.invalidateQueries({ queryKey: queryKeys.entitlement });
    });
    return () => subscription.remove();
  }, []);
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

/** Après un achat ou une restauration : le serveur revérifie le droit, puis tout contenu verrouillé est relu. */
export async function refreshAfterPurchase(): Promise<boolean> {
  const backend = getBackend();
  if (!backend) return false;
  const state = await endpoints(backend).refreshEntitlement();
  await Promise.all([['reading'], ['daily'], ['group-reading'], queryKeys.entitlement].map((queryKey) => client.invalidateQueries({ queryKey })));
  return state.premium;
}

/** Offres lues chez RevenueCat (prix de StoreKit). Inactif sans clé : le paywall l'annonce. */
export const useOffers = () =>
  useQuery({
    queryKey: queryKeys.offers,
    enabled: purchasesEnabled,
    queryFn: async (): Promise<Offers> => {
      const backend = getBackend();
      if (!backend) throw new NotConfiguredError();
      await ensureSession(backend);
      return loadOffers();
    },
  });

export class NotConfiguredError extends Error {}

/** Thème courant, lu directement dans Supabase sous RLS (A-002). Null si aucun thème n'existe encore. */
export const useCurrentChart = () =>
  useQuery({
    queryKey: queryKeys.currentChart,
    // Le thème ne change qu'à la modification des données de naissance : frais jusqu'à invalidation explicite.
    staleTime: Number.POSITIVE_INFINITY,
    queryFn: async (): Promise<{ id: string; chart: ChartPayload } | null> => {
      const backend = getBackend();
      if (!backend) throw new NotConfiguredError();
      await ensureSession(backend);
      const { data, error } = await backend.supabase.from('charts').select('id, payload').eq('is_current', true).maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return { id: String(data.id), chart: ChartPayloadSchema.parse(data.payload) };
    },
  });

/** Une section de la lecture complète (SPEC §7.4). Le serveur décide : texte complet, ou accroche et `locked`. */
export const useSection = (key: SectionKey, mode: ToneMode) =>
  useQuery({
    queryKey: queryKeys.section(key, mode),
    queryFn: async (): Promise<SectionResponse> => {
      const backend = getBackend();
      if (!backend) throw new NotConfiguredError();
      await ensureSession(backend);
      return endpoints(backend).getSection(key, mode);
    },
  });

/** La page du jour (climat lunaire, horoscope du signe, question, transit personnel), partagée par l'accueil et l'horoscope. */
export const useDaily = (date: string, mode: ToneMode) =>
  useQuery({
    queryKey: queryKeys.daily(date, mode),
    queryFn: async (): Promise<DailyResponse> => {
      const backend = getBackend();
      if (!backend) throw new NotConfiguredError();
      await ensureSession(backend);
      return endpoints(backend).getDaily(date, mode);
    },
  });

/** Résumés des placements du thème courant dans un mode (feuille de placement). Stables : en cache par thème et par mode. */
export const useChartSummaries = (chartId: string | null, mode: ToneMode) =>
  useQuery({
    queryKey: queryKeys.summaries(chartId ?? '', mode),
    enabled: chartId !== null,
    staleTime: Number.POSITIVE_INFINITY,
    queryFn: async (): Promise<ChartSummaries> => {
      const backend = getBackend();
      if (!backend) throw new NotConfiguredError();
      await ensureSession(backend);
      return endpoints(backend).getChartSummaries(mode);
    },
  });

/**
 * Droit Premium, lu sous RLS dans la table tenue par le serveur (SPEC §18.3). Sert seulement à l'affichage
 * (badges, verrous) : le serveur reste seul juge de ce qu'il envoie.
 */
export const useEntitlement = () =>
  useQuery({
    queryKey: queryKeys.entitlement,
    queryFn: async (): Promise<{ premium: boolean }> => {
      const backend = getBackend();
      if (!backend) return { premium: false };
      await ensureSession(backend);
      const { data, error } = await backend.supabase.from('entitlements').select('is_premium, expires_at').maybeSingle();
      if (error) throw error;
      const expiresAt = data?.expires_at ? Date.parse(String(data.expires_at)) : null;
      return { premium: data?.is_premium === true && (expiresAt === null || expiresAt > Date.now()) };
    },
  });
