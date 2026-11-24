// Écran de calcul et première révélation du roast (SPEC §7.1). Les étapes affichées sont réelles :
// aucune attente artificielle. L'animation de l'aurore (T-015) et le partage (T-034) viendront s'y greffer.
import { SIGN_NAMES, TONE_MODES, type RoastResponse, type SignId, type ToneMode } from '@aurorya/shared';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, View } from 'react-native';
import { Banner, Button, Card, Chip, EmptyState, Screen, Text } from '@/components/ui';
import { ApiError } from '@/services/api-client';
import { endpoints, ensureSession, getBackend } from '@/services/backend';
import { useOnboarding } from '@/store/onboarding';
import { useTheme } from '@/theme/ThemeProvider';
import { toChartInput, toProfileInput } from './draft';

type Phase = 'profile' | 'chart' | 'roast';
type Failure = 'error' | 'unconfigured' | 'ageRestricted' | 'timeNonexistent' | 'nameRejected';
const failureOf = (error: unknown): Failure => {
  if (error instanceof ApiError) {
    if (error.code === 'AGE_RESTRICTED') return 'ageRestricted';
    if (error.code === 'BIRTH_TIME_NONEXISTENT') return 'timeNonexistent';
    if (error.code === 'NAME_REJECTED') return 'nameRejected';
  }
  return 'error';
};
const FIX_ROUTE = { ageRestricted: '/birth-date', timeNonexistent: '/birth-time', nameRejected: '/welcome' } as const;

export function ComputingScreen() {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const { draft, setResult, reset } = useOnboarding();
  const [phase, setPhase] = useState<Phase>('profile');
  const [failure, setFailure] = useState<Failure | null>(null);
  const running = useRef(false);

  const run = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    setFailure(null);
    try {
      const backend = getBackend();
      if (!backend) { setFailure('unconfigured'); return; }
      const profile = toProfileInput(draft, i18n.language === 'en' ? 'en' : 'fr', Intl.DateTimeFormat().resolvedOptions().timeZone);
      const chartInput = toChartInput(draft);
      if (!profile || !chartInput) { router.replace('/welcome'); return; }
      const api = endpoints(backend);
      await ensureSession(backend);
      setPhase('profile');
      await api.putProfile(profile);
      setPhase('chart');
      const chart = await api.postCharts(chartInput);
      setPhase('roast');
      // Si la lecture est indisponible, le thème reste acquis : la révélation le dit simplement.
      const roast = await api.postRoasts({ chartId: chart.chartId, mode: draft.toneMode }).catch(() => null);
      setResult(chart, roast);
      router.replace('/reveal');
    } catch (error) {
      const kind = failureOf(error);
      // En dessous de l'âge minimum, rien n'est conservé (SPEC §21.9).
      if (kind === 'ageRestricted') reset();
      setFailure(kind);
    } finally {
      running.current = false;
    }
  }, [draft, i18n.language, reset, router, setResult]);

  useEffect(() => { void run(); }, [run]);

  if (failure) {
    const fix = failure in FIX_ROUTE ? FIX_ROUTE[failure as keyof typeof FIX_ROUTE] : null;
    return (
      <Screen scroll={false}>
        <EmptyState title={t(`onboarding.computing.state.${failure}.title`)} body={t(`onboarding.computing.state.${failure}.body`)}
          {...(failure === 'unconfigured' ? {} : { action: fix ? { label: t('onboarding.computing.fix'), onPress: () => router.replace(fix) } : { label: t('common.retry'), onPress: () => void run() } })} />
      </Screen>
    );
  }
  return (
    <Screen scroll={false}>
      <View style={{ flex: 1, justifyContent: 'center', gap: theme.spacing.s24 }} accessibilityLiveRegion="polite">
        <Text variant="display" align="center" accessibilityRole="header">{t('onboarding.computing.title')}</Text>
        <ActivityIndicator color={theme.colors.accent} />
        <Text color="textSecondary" align="center">{t(`onboarding.computing.${phase}`)}</Text>
      </View>
    </Screen>
  );
}

export function RevealScreen() {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const { draft, chart, roast, complete, setResult } = useOnboarding();
  const [mode, setMode] = useState<ToneMode>(draft.toneMode);
  const [shown, setShown] = useState<RoastResponse | null>(roast);
  const [loading, setLoading] = useState(false);
  const locale = i18n.language === 'en' ? 'en' : 'fr';
  const sign = (id: SignId): string => SIGN_NAMES[locale][id];

  // Changer de mode charge ou génère la version correspondante (SPEC §7.1).
  const switchMode = async (next: ToneMode): Promise<void> => {
    const backend = getBackend();
    if (!backend || !chart || next === mode) return;
    setMode(next);
    setLoading(true);
    try {
      setShown(await endpoints(backend).postRoasts({ chartId: chart.chartId, mode: next }));
    } catch {
      setShown(null);
    } finally {
      setLoading(false);
    }
  };

  if (!chart) return <Screen scroll={false}><EmptyState title={t('onboarding.computing.state.error.title')} body={t('onboarding.computing.state.error.body')} action={{ label: t('common.retry'), onPress: () => router.replace('/computing') }} /></Screen>;
  const bigThree = [t('onboarding.reveal.bigThree.sun', { sign: sign(chart.sunSign) }), chart.moonSign ? t('onboarding.reveal.bigThree.moon', { sign: sign(chart.moonSign) }) : null, chart.ascSign ? t('onboarding.reveal.bigThree.asc', { sign: sign(chart.ascSign) }) : null].filter((x): x is string => x !== null).join(' · ');
  return (
    <Screen>
      <View style={{ gap: theme.spacing.s8 }}>
        <Text variant="display" accessibilityRole="header">{t('onboarding.reveal.title', { name: draft.firstName.trim() })}</Text>
        <Text variant="label" color="accent">{bigThree}</Text>
      </View>
      {chart.flags.timeAssumed ? <Banner message={t('onboarding.reveal.timeUnknown')} /> : null}
      <View style={{ gap: theme.spacing.s8 }}>
        <Text variant="label" color="textSecondary">{t('onboarding.reveal.modeLabel')}</Text>
        <View style={{ flexDirection: 'row', gap: theme.spacing.s8 }}>
          {TONE_MODES.map((m) => <Chip key={m} label={t(`modes.${m}.name`)} selected={mode === m} onPress={() => void switchMode(m)} />)}
        </View>
      </View>
      {loading ? <ActivityIndicator color={theme.colors.accent} accessibilityLabel={t('common.loading')} /> : null}
      {!loading && shown ? shown.punchlines.map((p) => (
        <Card key={p.anchor}>
          <Text variant="label" color="accent">{p.label}</Text>
          <Text variant="punchline">{p.text}</Text>
        </Card>
      )) : null}
      {!loading && !shown ? <Card><Text color="textSecondary">{t('onboarding.reveal.unavailable')}</Text></Card> : null}
      {!loading && shown ? <Button label={t('onboarding.reveal.share')} onPress={() => { setResult(chart, shown); router.push('/share/roast'); }} /> : null}
      {!loading && shown ? <Button variant="secondary" label={t('onboarding.reveal.fullReading')} onPress={() => { setResult(chart, shown); router.push(`/reading/big_three?mode=${shown.mode}`); }} /> : null}
      <Button variant="secondary" label={t('onboarding.reveal.createGroup')} onPress={() => { complete(); router.replace('/groups'); }} />
      <Button variant="ghost" label={t('onboarding.reveal.continue')} onPress={() => { complete(); router.replace('/today'); }} />
    </Screen>
  );
}
