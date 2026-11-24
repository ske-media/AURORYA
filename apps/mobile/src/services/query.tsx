// État serveur (SPEC §15.2) : TanStack Query, clés centralisées.
import { type ChartPayload, ChartPayloadSchema, type SectionKey, type SectionResponse, type ToneMode } from '@aurorya/shared';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { endpoints, ensureSession, getBackend } from './backend';

export const queryKeys = {
  currentChart: ['chart', 'current'] as const,
  section: (key: SectionKey, mode: ToneMode) => ['reading', 'section', key, mode] as const,
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
