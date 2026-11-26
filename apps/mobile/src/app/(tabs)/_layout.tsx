// Cinq onglets (SPEC §27.3, ADR-032) : Accueil, Horoscope, Explorer, Relations, Profil.
// Les noms de route internes (`today`, `sky`, `groups`) sont conservés : seuls les libellés changent.
import { NativeTabs } from 'expo-router/native-tabs';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme/ThemeProvider';

const TABS = [
  { name: 'home', label: 'tabs.home', sf: 'house' },
  { name: 'today', label: 'tabs.horoscope', sf: 'moon.stars' },
  { name: 'sky', label: 'tabs.explore', sf: 'sparkles' },
  { name: 'groups', label: 'tabs.relations', sf: 'heart' },
  { name: 'profile', label: 'tabs.profile', sf: 'person' },
] as const;

export default function TabsLayout() {
  const theme = useTheme();
  const { t } = useTranslation();
  return (
    <NativeTabs backgroundColor={theme.colors.surface} tintColor={theme.colors.accent}>
      {TABS.map((tab) => (
        <NativeTabs.Trigger key={tab.name} name={tab.name}>
          <NativeTabs.Trigger.Label>{t(tab.label)}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={tab.sf} />
        </NativeTabs.Trigger>
      ))}
    </NativeTabs>
  );
}
