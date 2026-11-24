// Configuration de l'app (SPEC §15.10). Les valeurs d'environnement viennent d'EAS, jamais du dépôt.
import type { ConfigContext, ExpoConfig } from 'expo/config';

// Même valeur que palette.midnight (packages/shared) : ce fichier est lu par l'outillage natif,
// hors du bundle. Un test vérifie que les deux restent identiques.
const SPLASH_BACKGROUND = '#11121B';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: process.env.APP_DISPLAY_NAME ?? 'Aurorya',
  slug: 'aurorya',
  version: '0.1.0',
  scheme: 'aurorya',
  orientation: 'portrait',
  userInterfaceStyle: 'dark',
  backgroundColor: SPLASH_BACKGROUND,
  icon: './assets/icons/icon-app-ios.png',
  ios: {
    // ADR-003. Définitif après publication.
    bundleIdentifier: 'com.aurorya.app',
    supportsTablet: false,
    config: { usesNonExemptEncryption: false },
  },
  plugins: [
    'expo-router',
    'expo-localization',
    // Ajout seul à la photothèque, demandé au moment d'enregistrer une carte (SPEC §7.3). Aucune lecture des photos.
    ['expo-media-library', { photosPermission: false, savePhotosPermission: 'Aurorya enregistre ta carte dans tes photos quand tu le demandes.' }],
    ['expo-splash-screen', { backgroundColor: SPLASH_BACKGROUND, image: './assets/icons/splash-symbol.png', imageWidth: 160 }],
  ],
  experiments: { typedRoutes: true },
  extra: {
    apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? null,
    environment: process.env.APP_ENV ?? 'development',
  },
});
