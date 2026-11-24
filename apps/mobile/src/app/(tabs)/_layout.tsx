// Trois onglets au MVP : Aujourd'hui, Mon ciel, Mes groupes (SPEC §6.1).
import { NativeTabs } from 'expo-router/native-tabs';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme/ThemeProvider';

export default function TabsLayout() {
  const theme = useTheme();
  const { t } = useTranslation();
  return (
    <NativeTabs backgroundColor={theme.colors.surface} tintColor={theme.colors.accent}>
      <NativeTabs.Trigger name="today">
        <NativeTabs.Trigger.Label>{t('tabs.today')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="sun.horizon" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="sky">
        <NativeTabs.Trigger.Label>{t('tabs.sky')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="moon.stars" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="groups">
        <NativeTabs.Trigger.Label>{t('tabs.groups')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="person.2" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
