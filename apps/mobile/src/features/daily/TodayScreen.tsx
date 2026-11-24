// Onglet « Aujourd'hui » (SPEC §7.5) : climat lunaire calculé, horoscope du signe, question du jour.
import { MOON_PHASES, type MoonPhase, SIGN_NAMES } from '@aurorya/shared';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator } from 'react-native';
import { Button, Card, EmptyState, Screen, Text } from '@/components/ui';
import { toIsoDate } from '@/features/onboarding/draft';
import { endpoints, ensureSession, getBackend } from '@/services/backend';
import { NotConfiguredError } from '@/services/query';
import { useOnboarding } from '@/store/onboarding';
import { useTheme } from '@/theme/ThemeProvider';

export function TodayScreen() {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const { draft } = useOnboarding();
  const router = useRouter();
  const locale = i18n.language === 'en' ? 'en' : 'fr';
  // Le « jour » est la date locale de l'appareil.
  const date = toIsoDate(new Date());
  const query = useQuery({
    queryKey: ['daily', date, draft.toneMode],
    queryFn: async () => {
      const backend = getBackend();
      if (!backend) throw new NotConfiguredError();
      await ensureSession(backend);
      return endpoints(backend).getDaily(date, draft.toneMode);
    },
  });

  const header = (
    <>
      <Text variant="label" color="accent">{new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())}</Text>
      <Text variant="title1" accessibilityRole="header">{draft.firstName.trim() ? t('today.greeting', { name: draft.firstName.trim() }) : t('today.title')}</Text>
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
  return (
    <Screen>
      {header}
      <Text color="textSecondary">{t('today.moon', { sign: SIGN_NAMES[locale][daily.sky.moonSign], phase: t(`today.phase.${phase}`) })}</Text>
      <Card>
        <Text variant="label" color="accent">{t('today.horoscopeLabel')}</Text>
        {daily.signHoroscope ? (
          <>
            <Text variant="title2">{daily.signHoroscope.headline}</Text>
            <Text>{daily.signHoroscope.body}</Text>
          </>
        ) : <Text color="textSecondary">{t('today.state.noHoroscope')}</Text>}
      </Card>
      {daily.question ? (
        <Card raised>
          <Text variant="label" color="accent">{t('today.questionLabel')}</Text>
          <Text variant="quote">{daily.question}</Text>
        </Card>
      ) : null}
      {daily.personal.locked ? <Card><Text variant="bodySmall" color="textSecondary">{t('today.personalLocked')}</Text></Card> : null}
      <Button variant="ghost" label={t('settings.open')} onPress={() => router.push('/settings')} />
    </Screen>
  );
}
