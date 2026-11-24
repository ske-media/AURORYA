// Internationalisation (SPEC §15.6). Le français est la référence ; l'anglais est prêt mais reste
// désactivé tant que le drapeau distant `flags.locale_en_enabled` est faux (D-005).
import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en/common.json';
import fr from './locales/fr/common.json';
import { resolveLocale } from './resolve-locale';

export const resources = { fr: { common: fr }, en: { common: en } } as const;

export function initI18n(englishEnabled = false): typeof i18n {
  if (!i18n.isInitialized) {
    void i18n.use(initReactI18next).init({
      resources,
      lng: resolveLocale(englishEnabled, getLocales()[0]?.languageCode ?? null),
      fallbackLng: 'fr',
      defaultNS: 'common',
      interpolation: { escapeValue: false },
      returnNull: false,
    });
  }
  return i18n;
}

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    resources: (typeof resources)['fr'];
  }
}
