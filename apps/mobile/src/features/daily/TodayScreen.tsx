// Onglet « Horoscope » (SPEC §7.5, §27.3) : climat lunaire calculé, horoscope du signe, question du jour,
// transit personnel du jour (nommé pour toutes, lu avec le droit Premium).
import { MOON_PHASES, type MoonPhase, SIGN_NAMES, type ToneMode } from '@aurorya/shared';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, View } from 'react-native';
import type { AssetId } from '@/assets/registry';
import { MoonPhaseIcon } from '@/components/astro/MoonPhaseIcon';
import { BlurLock, Card, EmptyState, ModeSelector, PhotoHalo, Screen, Text } from '@/components/ui';
import { toIsoDate } from '@/features/onboarding/draft';
import { paywallHref } from '@/features/paywall/open-paywall';
import { NotConfiguredError, useDaily } from '@/services/query';
import { useOnboarding } from '@/store/onboarding';
import { useTheme } from '@/theme/ThemeProvider';

export function TodayScreen() {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const { draft } = useOnboarding();
  const [mode, setMode] = useState<ToneMode>(draft.toneMode);
  const router = useRouter();
  const locale = i18n.language === 'en' ? 'en' : 'fr';
  // Le « jour » est la date locale de l'appareil.
  const date = toIsoDate(new Date());
  const query = useDaily(date, mode);

  const header = (
    <>
      <Text variant="label" color="accent">{new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())}</Text>
      <Text variant="title1" accessibilityRole="header">{t('today.title')}</Text>
    </>
  );
  if (query.isPending) return <Screen>{header}<ActivityIndicator color={theme.colors.accent} accessibilityLabel={t('common.loading')} /></Screen>;
  if (query.isError) {
    const unconfigured = query.error instanceof NotConfiguredError;
    return (
      <Screen>{header}
        <EmptyState title={t(unconfigured ? 'onboarding.computing.state.unconfigured.title' : 'today.state.error.title')} body={t(unconfigured ? 'onboarding.computing.state.unconfigured.body' : 'today.state.error.body')}
          {...(unconfigured ? {} : { action: { label: t('common.retry'), onPress: () => void query.refetch() } })} />
      </Screen>
    );
  }
  const daily = query.data;
  const phase: MoonPhase = (MOON_PHASES as readonly string[]).includes(daily.sky.moonPhase) ? (daily.sky.moonPhase as MoonPhase) : 'new_moon';
  const { personal } = daily;
  return (
    <Screen>
      {header}
      <ModeSelector value={mode} onChange={setMode} />
      <Card raised>
        <PhotoHalo id={`photo-sign-${daily.sky.moonSign}` as AssetId} height={theme.spacing.s56 * 2} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.s16 }}>
          <MoonPhaseIcon phase={phase} size={theme.spacing.s40} />
          <View style={{ flex: 1 }}><Text>{t('today.moon', { sign: SIGN_NAMES[locale][daily.sky.moonSign], phase: t(`today.phase.${phase}`) })}</Text></View>
        </View>
      </Card>
      <Card>
        <Text variant="label" color="accent">{t('today.horoscopeLabel')}</Text>
        {daily.signHoroscope ? (
          <>
            <Text variant="title2">{daily.signHoroscope.headline}</Text>
            <Text>{daily.signHoroscope.body}</Text>
            {daily.signHoroscope.status === 'fallback' ? <Text variant="caption" color="textSecondary">{t('today.fallbackNote')}</Text> : null}
          </>
        ) : <Text color="textSecondary">{t('today.state.noHoroscope')}</Text>}
      </Card>
      {daily.question ? (
        <Card raised>
          <Text variant="label" color="accent">{t('today.questionLabel')}</Text>
          <Text variant="quote">{daily.question}</Text>
        </Card>
      ) : null}
      <Card glow>
        <Text variant="label" color="accent">{t('today.personalLabel')}</Text>
        {personal.headline ? <Text variant="title2">{t('today.personalHeadline', { headline: personal.headline })}</Text> : <Text color="textSecondary">{t('today.personalEmpty')}</Text>}
        {personal.locked
          ? <BlurLock message={t('today.personalTeaser')} actionLabel={t('paywall.unlock')} onPress={() => router.push(paywallHref('daily'))} />
          : personal.items.map((item) => (
            <View key={item.label} style={{ gap: theme.spacing.s4 }}>
              <Text variant="label" color="textSecondary">{item.label}</Text>
              <Text>{item.text}</Text>
            </View>
          ))}
      </Card>
    </Screen>
  );
}
