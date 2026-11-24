// Brouillon d'onboarding, conservé dans le trousseau si l'app est fermée (SPEC §7.1).
import type { ChartSummary, RoastResponse } from '@aurorya/shared';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { EMPTY_DRAFT, type OnboardingDraft } from '@/features/onboarding/draft';
import { secureStorage } from '@/services/secure-storage';

type OnboardingState = {
  draft: OnboardingDraft;
  completed: boolean;
  chart: ChartSummary | null;
  roast: RoastResponse | null;
  hydrated: boolean;
  update: (patch: Partial<OnboardingDraft>) => void;
  setResult: (chart: ChartSummary, roast: RoastResponse | null) => void;
  complete: () => void;
  reset: () => void;
};

export const useOnboarding = create<OnboardingState>()(
  persist(
    (set) => ({
      draft: EMPTY_DRAFT, completed: false, chart: null, roast: null, hydrated: false,
      update: (patch) => set((state) => ({ draft: { ...state.draft, ...patch } })),
      setResult: (chart, roast) => set({ chart, roast }),
      complete: () => set({ completed: true }),
      reset: () => set({ draft: EMPTY_DRAFT, completed: false, chart: null, roast: null }),
    }),
    {
      name: 'aurorya.onboarding',
      storage: createJSONStorage(() => secureStorage),
      partialize: (state) => ({ draft: state.draft, completed: state.completed, chart: state.chart }),
      onRehydrateStorage: () => () => useOnboarding.setState({ hydrated: true }),
    },
  ),
);
