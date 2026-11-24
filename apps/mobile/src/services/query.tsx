// État serveur (SPEC §15.2) : TanStack Query, clés centralisées.
import { type ChartPayload, ChartPayloadSchema } from '@aurorya/shared';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { ensureSession, getBackend } from './backend';

export const queryKeys = { currentChart: ['chart', 'current'] as const };

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
