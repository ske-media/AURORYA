// Écran de partage de la carte du roast (SPEC §7.3, §15.8).
import { SIGN_NAMES, type SignId } from '@aurorya/shared';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Banner, Button, Chip, EmptyState, Screen, Text } from '@/components/ui';
import { captureCard, saveCard, shareCard } from '@/services/share';
import { useOnboarding } from '@/store/onboarding';
import { type CardViewRef, RoastCard } from './RoastCard';
import { buildRoastCard, siteHost } from './card-model';

type Notice = 'saved' | 'denied' | 'failed' | null;

export function ShareRoastScreen() {
  const { t, i18n } = useTranslation();
  const { draft, chart, roast } = useOnboarding();
  const cardRef = useRef<CardViewRef>(null);
  const [hideName, setHideName] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState<'share' | 'save' | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const locale = i18n.language === 'en' ? 'en' : 'fr';

  const header = <Text variant="title1" accessibilityRole="header">{t('share.title')}</Text>;
  if (!chart || !roast) return <Screen>{header}<EmptyState title={t('share.state.empty.title')} body={t('share.state.empty.body')} /></Screen>;

  const sign = (id: SignId): string => SIGN_NAMES[locale][id];
  const model = buildRoastCard({
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
      if (kind === 'share') await shareCard(file);
      else setNotice((await saveCard(file)) ? 'saved' : 'denied');
    } catch {
      setNotice('failed');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen>
      {header}
      <View style={{ alignItems: 'center' }} accessible accessibilityRole="image"
        accessibilityLabel={[model.title, model.bigThree, ...model.blocks.map((b) => `${b.label}. ${b.text}`)].join('. ')}>
        <RoastCard ref={cardRef} model={model} onReady={() => setReady(true)} />
      </View>
      <Chip label={t('share.hideName')} selected={hideName} onPress={() => setHideName((v) => !v)} />
      {notice ? <Banner message={t(`share.notice.${notice}`)} /> : null}
      <Button label={t('share.share')} loading={busy === 'share'} disabled={!ready || busy !== null} onPress={() => void run('share')} />
      <Button variant="secondary" label={t('share.save')} loading={busy === 'save'} disabled={!ready || busy !== null} onPress={() => void run('save')} />
    </Screen>
  );
}
