// Écran de calcul et première révélation du roast (SPEC §7.1). Les étapes affichées sont réelles :
// aucune attente artificielle. L'aurore (T-015) se construit au rythme de ces étapes.
import { SIGN_NAMES, type RoastResponse, type SignId, type ToneMode } from '@aurorya/shared';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, View, useWindowDimensions } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import type { AssetId } from '@/assets/registry';
import { type AuroraStage, AuroraRise } from '@/components/astro/AuroraRise';
import { Banner, Button, Card, EmptyState, ModeSelector, PhotoHalo, Screen, Text } from '@/components/ui';
import { ApiError } from '@/services/api-client';
import { endpoints, ensureSession, getBackend } from '@/services/backend';
import { paywallHref } from '@/features/paywall/open-paywall';
import { feedback } from '@/services/feedback';
import { purchasesEnabled } from '@/services/purchases';
import { useOnboarding } from '@/store/onboarding';
import { usePreferences } from '@/store/preferences';
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
const STAGE_OF: Readonly<Record<Phase, AuroraStage>> = { profile: 1, chart: 2, roast: 3 };
const FIX_ROUTE = { ageRestricted: '/birth-date', timeNonexistent: '/birth-time', nameRejected: '/welcome' } as const;

export function ComputingScreen() {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const { draft, setResult, reset } = useOnboarding();
  const [phase, setPhase] = useState<Phase>('profile');
  const [failure, setFailure] = useState<Failure | null>(null);
  const [done, setDone] = useState(false);
  const { width } = useWindowDimensions();
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
      feedback.tap();
      const chart = await api.postCharts(chartInput);
      setPhase('roast');
      // Si la lecture est indisponible, le thème reste acquis : la révélation le dit simplement.
      const roast = await api.postRoasts({ chartId: chart.chartId, mode: draft.toneMode }).catch(() => null);
      setResult(chart, roast);
      // L'aurore s'achève (les jambes du A, l'étoile), puis la révélation s'ouvre.
      feedback.sound('sfx-aurora-rise');
      feedback.success();
      setDone(true);
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
        <View style={{ alignItems: 'center' }}>
          <AuroraRise stage={done ? 4 : STAGE_OF[phase]} size={Math.min(width - theme.screenMargin * 2, theme.spacing.s56 * 4)} onFinished={() => router.replace('/reveal')} />
        </View>
        <Text variant="quote" color="textSecondary" align="center">{t(`onboarding.computing.${phase}`)}</Text>
      </View>
    </Screen>
  );
}

export function RevealScreen() {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const { draft, chart, roast, complete, setResult } = useOnboarding();
  const { firstPaywallShownAt, markFirstPaywallShown } = usePreferences();
  const [mode, setMode] = useState<ToneMode>(roast?.mode ?? draft.toneMode);
  const [shown, setShown] = useState<RoastResponse | null>(roast);
  const [loading, setLoading] = useState(false);
  const locale = i18n.language === 'en' ? 'en' : 'fr';
  const sign = (id: SignId): string => SIGN_NAMES[locale][id];
  const readingId = shown?.readingId ?? null;

  // Chaque punchline arrive à son tour : un son à la première, une vibration à chacune.
  useEffect(() => {
    if (!readingId) return undefined;
    const timers = [0, 1, 2].map((i) => setTimeout(() => {
      if (i === 0) feedback.sound('sfx-reveal');
      feedback.reveal();
    }, i * theme.motion.revealStaggerMs));
    return () => timers.forEach(clearTimeout);
  }, [readingId, theme.motion.revealStaggerMs]);

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
  const rule = <View style={{ flex: 1, height: theme.borderWidth, backgroundColor: theme.colors.border }} />;
  const leave = (to: '/share/roast' | '/groups' | '/sky' | `/reading/big_three?mode=${ToneMode}`, finish: boolean): void => {
    if (shown) setResult(chart, shown);
    if (finish) { complete(); router.replace(to); } else router.push(to);
    // Première sortie de la révélation : le paywall s'ouvre une seule fois, hors parcours d'invitation (D-021).
    // Tant que les achats ne sont pas ouverts, il ne s'impose pas.
    if (purchasesEnabled && firstPaywallShownAt === null && !draft.pendingInviteToken) {
      markFirstPaywallShown();
      router.push(paywallHref('after_roast'));
    }
  };
  return (
    <Screen>
      <View style={{ gap: theme.spacing.s16, paddingTop: theme.spacing.s24 }}>
        <PhotoHalo id={`photo-sign-${chart.sunSign}` as AssetId} height={theme.spacing.s56 * 3} />
        <Text variant="display" align="center" accessibilityRole="header">{t('onboarding.reveal.title', { name: draft.firstName.trim() })}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.s12 }}>
          {rule}
          <Text variant="label" color="accent" align="center">{bigThree}</Text>
          {rule}
        </View>
      </View>
      {chart.flags.timeAssumed ? <Banner message={t('onboarding.reveal.timeUnknown')} /> : null}
      <ModeSelector value={mode} onChange={(next) => void switchMode(next)} showDescription disabled={loading} />
      {loading ? <ActivityIndicator color={theme.colors.accent} accessibilityLabel={t('common.loading')} /> : null}
      {!loading && shown ? shown.punchlines.map((p, i) => (
        <Animated.View key={`${shown.readingId}-${p.anchor}`} entering={FadeInDown.delay(i * theme.motion.revealStaggerMs).duration(theme.durations.base)}>
          <Card>
            {/* Filet d'accent à gauche : la punchline se lit comme une citation. */}
            <View style={{ borderLeftWidth: theme.spacing.s2, borderLeftColor: theme.colors.accent, paddingLeft: theme.spacing.s16, gap: theme.spacing.s8 }}>
              <Text variant="label" color="accent">{p.label}</Text>
              <Text variant="punchline">{p.text}</Text>
            </View>
          </Card>
        </Animated.View>
      )) : null}
      {!loading && !shown ? <Card><Text color="textSecondary">{t('onboarding.reveal.unavailable')}</Text></Card> : null}
      <View style={{ gap: theme.spacing.s12 }}>
        {!loading && shown ? <Button label={t('onboarding.reveal.share')} icon="icon-ui-share" onPress={() => leave('/share/roast', false)} /> : null}
        {!loading && shown ? <Button variant="secondary" label={t('onboarding.reveal.fullReading')} icon="icon-ui-sparkle" onPress={() => leave(`/reading/big_three?mode=${shown.mode}`, false)} /> : null}
        <Button variant="secondary" label={t('onboarding.reveal.createGroup')} icon="icon-ui-users" onPress={() => leave('/groups', true)} />
        <Button variant="ghost" label={t('onboarding.reveal.continue')} onPress={() => leave('/sky', true)} />
      </View>
    </Screen>
  );
}
