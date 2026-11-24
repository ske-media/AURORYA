// Brouillon d'onboarding (SPEC §7.1) : règles de saisie, pures et testables.
import type { GrammaticalGender, PostChartsInput, PutProfileInput, TimePrecision, TimeWindow, ToneMode } from '@aurorya/shared';
import { DEFAULT_TONE_MODE } from '@aurorya/shared';

export const ONBOARDING_STEPS = ['welcome', 'birth-date', 'birth-time', 'birth-place', 'quiz'] as const;
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];
export const MIN_BIRTH_YEAR = 1900;

export type Place = Readonly<{ geonameId: number; name: string; admin1Name: string | null; countryCode: string }>;
export type OnboardingDraft = Readonly<{
  firstName: string;
  grammaticalGender: GrammaticalGender | null;
  birthDate: string | null;
  timePrecision: TimePrecision | null;
  birthTime: string | null;
  timeWindow: TimeWindow | null;
  place: Place | null;
  interests: PutProfileInput['interests'];
  astroLevel: PutProfileInput['astroLevel'];
  toneMode: ToneMode;
  /** Jeton d'invitation mis de côté pendant l'onboarding (SPEC §15.10). */
  pendingInviteToken: string | null;
}>;

export const EMPTY_DRAFT: OnboardingDraft = {
  firstName: '', grammaticalGender: null, birthDate: null, timePrecision: null, birthTime: null, timeWindow: null, place: null,
  interests: [], astroLevel: null, toneMode: DEFAULT_TONE_MODE, pendingInviteToken: null,
};

const NAME_PATTERN = /^[\p{L}][\p{L} '’-]*$/u;
/** Même règle de forme que le serveur, qui reste seul juge (liste de mots bloqués comprise). */
export const isFirstNameWellFormed = (input: string): boolean => {
  const trimmed = input.trim().replace(/\s+/g, ' ');
  const length = [...trimmed].length;
  return length >= 1 && length <= 24 && NAME_PATTERN.test(trimmed);
};

const pad = (n: number): string => String(n).padStart(2, '0');
export const toIsoDate = (date: Date): string => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

/** Dernière date de naissance acceptée : aujourd'hui moins l'âge minimum. */
export const latestBirthDate = (today: Date, minAge: number): string => toIsoDate(new Date(today.getFullYear() - minAge, today.getMonth(), today.getDate()));
export const earliestBirthDate = (): string => `${MIN_BIRTH_YEAR}-01-01`;
export const isOldEnough = (birthDate: string, today: Date, minAge: number): boolean => birthDate <= latestBirthDate(today, minAge);

export function isStepComplete(step: OnboardingStep, draft: OnboardingDraft): boolean {
  switch (step) {
    case 'welcome':
      return isFirstNameWellFormed(draft.firstName) && draft.grammaticalGender !== null;
    case 'birth-date':
      return draft.birthDate !== null && draft.birthDate >= earliestBirthDate();
    case 'birth-time':
      if (draft.timePrecision === 'exact') return draft.birthTime !== null;
      if (draft.timePrecision === 'approx') return draft.timeWindow !== null;
      return draft.timePrecision === 'unknown';
    case 'birth-place':
      return draft.place !== null;
    case 'quiz':
      return true; // Mars est présélectionné (D-008) ; les deux autres questions sont facultatives.
  }
}

/** Premier écran incomplet, ou null si tout est rempli. */
export const firstIncompleteStep = (draft: OnboardingDraft): OnboardingStep | null =>
  ONBOARDING_STEPS.find((step) => !isStepComplete(step, draft)) ?? null;

export function toProfileInput(draft: OnboardingDraft, locale: 'fr' | 'en', tz: string): PutProfileInput | null {
  if (draft.grammaticalGender === null || !isFirstNameWellFormed(draft.firstName)) return null;
  return { firstName: draft.firstName.trim(), grammaticalGender: draft.grammaticalGender, locale, tz, interests: draft.interests, astroLevel: draft.astroLevel, toneModeDefault: draft.toneMode };
}

export function toChartInput(draft: OnboardingDraft): PostChartsInput | null {
  if (draft.birthDate === null || draft.timePrecision === null || draft.place === null) return null;
  return {
    placeId: draft.place.geonameId,
    date: draft.birthDate,
    timePrecision: draft.timePrecision,
    time: draft.timePrecision === 'exact' ? draft.birthTime : null,
    timeWindow: draft.timePrecision === 'approx' ? draft.timeWindow : null,
    dstChoice: null,
  };
}
