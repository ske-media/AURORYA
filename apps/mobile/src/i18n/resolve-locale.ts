import type { Locale } from '@aurorya/shared';

/** Langue de l'app : le français, sauf si l'anglais est activé et que le téléphone est en anglais (D-005). */
export const resolveLocale = (englishEnabled: boolean, deviceLanguage: string | null): Locale =>
  englishEnabled && deviceLanguage === 'en' ? 'en' : 'fr';
