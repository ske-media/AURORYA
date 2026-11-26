// Préférences sensorielles (SPEC §15.9) : sons et vibrations, actifs par défaut, réglables dans les réglages.
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { secureStorage } from '@/services/secure-storage';

type PreferencesState = {
  soundsEnabled: boolean;
  hapticsEnabled: boolean;
  setSoundsEnabled: (value: boolean) => void;
  setHapticsEnabled: (value: boolean) => void;
};

export const usePreferences = create<PreferencesState>()(
  persist(
    (set) => ({
      soundsEnabled: true,
      hapticsEnabled: true,
      setSoundsEnabled: (soundsEnabled) => set({ soundsEnabled }),
      setHapticsEnabled: (hapticsEnabled) => set({ hapticsEnabled }),
    }),
    { name: 'aurorya.preferences', storage: createJSONStorage(() => secureStorage) },
  ),
);
