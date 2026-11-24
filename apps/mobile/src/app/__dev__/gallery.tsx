// Galerie interne des tokens et composants. Présente uniquement dans les builds de développement (SPEC §16.5).
import { COLOR_ROLES, TEXT_VARIANTS } from '@aurorya/shared';
import { Redirect } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Banner, Button, Card, Chip, Screen, Text } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';

export default function Gallery() {
  const theme = useTheme();
  const { t } = useTranslation();
  const [selected, setSelected] = useState(false);
  if (!__DEV__) return <Redirect href="/today" />;
  const noop = (): void => undefined;
  return (
    <Screen>
      <Text variant="title1" accessibilityRole="header">{t('gallery.title')}</Text>

      <Text variant="label" color="accent">{t('gallery.colors')}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.s8 }}>
        {COLOR_ROLES.map((role) => (
          <View key={role} style={{ width: theme.spacing.s56 + theme.spacing.s40, gap: theme.spacing.s4 }}>
            <View style={{ height: theme.spacing.s40, borderRadius: theme.radii.sm, borderWidth: theme.borderWidth, borderColor: theme.colors.border, backgroundColor: theme.colors[role] }} />
            <Text variant="caption" color="textSecondary">{role}</Text>
          </View>
        ))}
      </View>

      <Text variant="label" color="accent">{t('gallery.typography')}</Text>
      {TEXT_VARIANTS.map((variant) => (
        <View key={variant} style={{ gap: theme.spacing.s2 }}>
          <Text variant="caption" color="textSecondary">{variant}</Text>
          <Text variant={variant}>{t('gallery.sampleText')}</Text>
        </View>
      ))}

      <Text variant="label" color="accent">{t('gallery.components')}</Text>
      <Button label={t('gallery.primary')} onPress={noop} />
      <Button label={t('gallery.secondary')} onPress={noop} variant="secondary" />
      <Button label={t('gallery.ghost')} onPress={noop} variant="ghost" />
      <Button label={t('gallery.loading')} onPress={noop} loading />
      <Button label={t('gallery.disabled')} onPress={noop} disabled />
      <View style={{ flexDirection: 'row', gap: theme.spacing.s8 }}>
        <Chip label={selected ? t('gallery.chipSelected') : t('gallery.chip')} selected={selected} onPress={() => setSelected((v) => !v)} />
      </View>
      <Card><Text>{t('gallery.card')}</Text></Card>
      <Banner message={t('gallery.banner')} />
    </Screen>
  );
}
