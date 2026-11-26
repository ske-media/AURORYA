// Écran de partage de la carte du roast (SPEC §7.3, §15.8).
import { type RoastResponse, SIGN_NAMES, type SignId, type ToneMode } from '@aurorya/shared';
import { useQuery } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, View } from 'react-native';
import { Banner, Button, Chip, EmptyState, ModeSelector, Screen, Text } from '@/components/ui';
import { endpoints, ensureSession, getBackend } from '@/services/backend';
import { feedback } from '@/services/feedback';
import { NotConfiguredError } from '@/services/query';
import { captureCard, saveCard, shareCard } from '@/services/share';
import { useOnboarding } from '@/store/onboarding';
import { useTheme } from '@/theme/ThemeProvider';
import { type CardViewRef, RoastCard } from './RoastCard';
import { buildRoastCard, siteHost } from './card-model';

type Notice = 'saved' | 'denied' | 'failed' | null;

export function ShareRoastScreen() {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const { draft, chart, roast: stored } = useOnboarding();
  const [mode, setMode] = useState<ToneMode>(stored?.mode ?? draft.toneMode);
  // Le roast d'un autre ton vient du serveur, qui le garde en cache : un seul calcul par ton (ADR-021).
  const other = useQuery<RoastResponse>({
    queryKey: ['roast', chart?.chartId ?? null, mode],
    enabled: chart !== null && stored !== null && stored.mode !== mode,
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
    queryFn: async () => {
      const backend = getBackend();
      if (!backend || !chart) throw new NotConfiguredError();
      await ensureSession(backend);
      return endpoints(backend).postRoasts({ chartId: chart.chartId, mode });
    },
  });
  const cardRef = useRef<CardViewRef>(null);
  const [hideName, setHideName] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState<'share' | 'save' | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const locale = i18n.language === 'en' ? 'en' : 'fr';

  const header = <Text variant="title1" accessibilityRole="header">{t('share.title')}</Text>;
  if (!chart || !stored) return <Screen>{header}<EmptyState title={t('share.state.empty.title')} body={t('share.state.empty.body')} /></Screen>;

  const roast = stored.mode === mode ? stored : other.data ?? null;
  const sign = (id: SignId): string => SIGN_NAMES[locale][id];
  const model = roast === null ? null : buildRoastCard({
    roast, firstName: draft.firstName, hideName, host: siteHost(process.env.EXPO_PUBLIC_SITE_HOST),
    bigThree: [t('onboarding.reveal.bigThree.sun', { sign: sign(chart.sunSign) }), chart.moonSign ? t('onboarding.reveal.bigThree.moon', { sign: sign(chart.moonSign) }) : null, chart.ascSign ? t('onboarding.reveal.bigThree.asc', { sign: sign(chart.ascSign) }) : null]
      .filter((x): x is string => x !== null),
    texts: { title: (name) => t('onboarding.reveal.title', { name }), titleAnonymous: t('share.card.titleAnonymous'), modeName: t(`modes.${roast.mode}.name`), cta: t('share.card.cta') },
  });

  const run = async (kind: 'share' | 'save'): Promise<void> => {
    setBusy(kind);
    setNotice(null);
    try {
      const file = await captureCard(cardRef);
      if (kind === 'share') {
        await shareCard(file);
        feedback.sound('sfx-share');
        feedback.success();
      } else {
        const saved = await saveCard(file);
        setNotice(saved ? 'saved' : 'denied');
        if (saved) { feedback.sound('sfx-share'); feedback.success(); }
      }
    } catch {
      setNotice('failed');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen>
      {header}
      <ModeSelector value={mode} onChange={(next) => { setReady(false); setMode(next); }} />
      {model ? (
        <View style={{ alignItems: 'center' }} accessible accessibilityRole="image"
          accessibilityLabel={[model.title, model.bigThree, ...model.blocks.map((b) => `${b.label}. ${b.text}`)].join('. ')}>
          <RoastCard key={mode} ref={cardRef} model={model} onReady={() => setReady(true)} />
        </View>
      ) : other.isError ? <Banner message={t('share.notice.modeUnavailable')} />
        : <View style={{ height: theme.spacing.s56 * 2, justifyContent: 'center' }}><ActivityIndicator color={theme.colors.accent} accessibilityLabel={t('common.loading')} /></View>}
      <Chip label={t('share.hideName')} selected={hideName} onPress={() => setHideName((v) => !v)} />
      {notice ? <Banner message={t(`share.notice.${notice}`)} /> : null}
      <Button label={t('share.share')} loading={busy === 'share'} icon="icon-ui-share" disabled={!model || !ready || busy !== null} onPress={() => void run('share')} />
      <Button variant="secondary" label={t('share.save')} loading={busy === 'save'} disabled={!model || !ready || busy !== null} onPress={() => void run('save')} />
    </Screen>
  );
}
