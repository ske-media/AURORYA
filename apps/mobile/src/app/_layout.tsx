// Racine : polices, thème, textes, puis navigation (SPEC §6.1).
import { fontFamilies } from '@aurorya/shared';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { getAsset } from '@/assets/registry';
import { initI18n } from '@/i18n';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';

void SplashScreen.preventAutoHideAsync();
initI18n();

function Navigator() {
  const theme = useTheme();
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.colors.bg } }} />
  );
}

export default function RootLayout() {
  // Polices embarquées, chargées par leur identifiant du registre : aucune police ne vient du réseau.
  const [loaded, error] = useFonts({
    [fontFamilies.serif]: getAsset('CormorantGaramond-Medium'),
    [fontFamilies.serifItalic]: getAsset('CormorantGaramond-MediumItalic'),
    [fontFamilies.heading]: getAsset('Manrope-SemiBold'),
    [fontFamilies.body]: getAsset('Inter-Regular'),
    [fontFamilies.bodyMedium]: getAsset('Inter-Medium'),
  });

  useEffect(() => {
    if (loaded || error) void SplashScreen.hideAsync();
  }, [loaded, error]);

  if (!loaded && !error) return null;
  return (
    <ThemeProvider>
      <StatusBar style="light" />
      <Navigator />
    </ThemeProvider>
  );
}
