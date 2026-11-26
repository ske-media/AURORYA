// État serveur (SPEC §15.2) : TanStack Query, clés centralisées.
import { type ChartPayload, ChartPayloadSchema, type ChartSummaries, type SectionKey, type SectionResponse, type ToneMode } from '@aurorya/shared';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { endpoints, ensureSession, getBackend } from './backend';

export const queryKeys = {
  currentChart: ['chart', 'current'] as const,
  section: (key: SectionKey, mode: ToneMode) => ['reading', 'section', key, mode] as const,
  summaries: (chartId: string, mode: ToneMode) => ['chart', 'summaries', chartId, mode] as const,
  entitlement: ['entitlement'] as const,
};

const client = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 5 * 60_000 } } });
export const QueryProvider = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;

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
