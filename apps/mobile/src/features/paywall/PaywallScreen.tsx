// Paywall (SPEC §7.8, D-021). Interface maison ; offres et prix lus chez RevenueCat tels que StoreKit les donne.
// Sans clé RevenueCat ou sans offre disponible, l'écran le dit : rien n'est simulé. Le serveur décide du droit.
import { SECTION_KEYS, SIGN_NAMES, type SectionKey, type SignId } from '@aurorya/shared';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Linking, Pressable, View } from 'react-native';
import { Banner, BrandMark, Button, Card, Icon, PhotoHalo, Screen, Text } from '@/components/ui';
import { feedback } from '@/services/feedback';
import { type Offer, purchase, purchasesEnabled, restorePurchases } from '@/services/purchases';
import { refreshAfterPurchase, useOffers } from '@/services/query';
import { useOnboarding } from '@/store/onboarding';
import { useTheme } from '@/theme/ThemeProvider';
import { TERMS_URL, privacyUrl } from './legal';

type Plan = 'annual' | 'monthly';
type Notice = 'failed' | 'pending' | 'nothingToRestore' | null;
const BENEFITS = ['reading', 'daily', 'groups'] as const;
const SELECTED_BORDER = 2;

function OfferCard({ plan, offer, selected, onSelect }: { plan: Plan; offer: Offer; selected: boolean; onSelect: () => void }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { product } = offer.pkg;
  return (
    <Pressable accessibilityRole="radio" accessibilityState={{ selected }} onPress={() => { feedback.select(); onSelect(); }}>
      <Card raised={selected} glow={selected}>
        <View style={{ margin: selected ? 0 : SELECTED_BORDER, gap: theme.spacing.s4 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text variant="heading">{t(`paywall.plan.${plan}.name`)}</Text>
            {plan === 'annual' ? <Text variant="label" color="accent">{t('paywall.plan.annual.badge')}</Text> : null}
          </View>
          {/* Le prix est la chaîne de StoreKit, jamais recomposée. */}
          <Text variant="numeric">{t(`paywall.plan.${plan}.price`, { price: product.priceString })}</Text>
          {plan === 'annual' && product.pricePerMonthString
            ? <Text variant="caption" color="textSecondary">{t('paywall.plan.annual.equivalent', { price: product.pricePerMonthString })}</Text> : null}
        </View>
      </Card>
    </Pressable>
  );
}

function FooterLink({ label, onPress, disabled = false }: { label: string; onPress: () => void; disabled?: boolean }) {
  const theme = useTheme();
  return (
    <Pressable accessibilityRole="link" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={{ minHeight: theme.minTouchTarget, justifyContent: 'center' }}>
      <Text variant="caption" color="accent">{label}</Text>
    </Pressable>
  );
}

export function PaywallScreen() {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const { trigger, context } = useLocalSearchParams<{ trigger?: string; context?: string }>();
  const { draft, chart } = useOnboarding();
  const offers = useOffers();
  const [plan, setPlan] = useState<Plan>('annual');
  const [busy, setBusy] = useState<'buy' | 'restore' | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const locale = i18n.language === 'en' ? 'en' : 'fr';

  const name = draft.firstName.trim();
  const sign = (id: SignId): string => SIGN_NAMES[locale][id];
  const bigThree = chart ? [t('onboarding.reveal.bigThree.sun', { sign: sign(chart.sunSign) }), chart.moonSign ? t('onboarding.reveal.bigThree.moon', { sign: sign(chart.moonSign) }) : null, chart.ascSign ? t('onboarding.reveal.bigThree.asc', { sign: sign(chart.ascSign) }) : null].filter((x): x is string => x !== null).join(' · ') : null;
  const section = trigger === 'section' && SECTION_KEYS.includes(context as SectionKey) ? (context as SectionKey) : null;
  const available = { annual: offers.data?.annual ?? null, monthly: offers.data?.monthly ?? null };
  const chosen = available[plan] ?? available.annual ?? available.monthly;
  const chosenPlan: Plan = chosen === available.annual && chosen !== null ? 'annual' : 'monthly';
  const privacy = privacyUrl();

  // Le droit n'est ouvert que lorsque le serveur l'a confirmé auprès de RevenueCat.
  const settle = async (missing: Notice): Promise<void> => {
    if (await refreshAfterPurchase()) {
      feedback.success();
      router.back();
    } else setNotice(missing);
  };
  const run = async (kind: 'buy' | 'restore'): Promise<void> => {
    setBusy(kind);
    setNotice(null);
    try {
      if (kind === 'restore') {
        await restorePurchases();
        await settle('nothingToRestore');
      } else if (chosen && (await purchase(chosen.pkg)) === 'purchased') await settle('pending');
    } catch {
      feedback.error();
      setNotice('failed');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen>
      <Pressable accessibilityRole="button" accessibilityLabel={t('common.close')} onPress={() => router.back()}
        style={{ alignSelf: 'flex-end', width: theme.minTouchTarget, height: theme.minTouchTarget, alignItems: 'center', justifyContent: 'center' }}>
        <Icon id="icon-ui-close" color="textSecondary" size={theme.spacing.s24} />
      </Pressable>
      <View style={{ alignItems: 'center', gap: theme.spacing.s12 }}>
        <PhotoHalo id="photo-scene-paywall" height={theme.spacing.s56 * 3} />
        <BrandMark size={theme.spacing.s56} />
        <Text variant="title1" align="center" accessibilityRole="header">{name ? t('paywall.title', { name }) : t('paywall.titleGeneric')}</Text>
        {bigThree ? <Text variant="label" color="accent" align="center">{bigThree}</Text> : null}
        {section ? <Text variant="bodySmall" color="textSecondary" align="center">{t('paywall.fromSection', { section: t(`reading.section.${section}`) })}</Text> : null}
      </View>
      <View style={{ gap: theme.spacing.s12 }}>
        {BENEFITS.map((key) => (
          <View key={key} style={{ flexDirection: 'row', gap: theme.spacing.s12, alignItems: 'flex-start' }}>
            <Icon id="icon-ui-check" color="accent" size={theme.spacing.s20} />
            <View style={{ flex: 1 }}><Text>{t(`paywall.benefit.${key}`)}</Text></View>
          </View>
        ))}
      </View>
      {!purchasesEnabled ? <Card><Text variant="heading">{t('paywall.soon.title')}</Text><Text color="textSecondary">{t('paywall.soon.body')}</Text></Card>
        : offers.isPending ? <ActivityIndicator color={theme.colors.accent} accessibilityLabel={t('common.loading')} />
          : !chosen ? <Card><Text color="textSecondary">{t('paywall.unavailable')}</Text><Button variant="secondary" label={t('common.retry')} onPress={() => void offers.refetch()} /></Card>
            : (
              <>
                <View accessibilityRole="radiogroup" style={{ gap: theme.spacing.s12 }}>
                  {(['annual', 'monthly'] as const).map((key) => {
                    const offer = available[key];
                    return offer ? <OfferCard key={key} plan={key} offer={offer} selected={chosenPlan === key} onSelect={() => setPlan(key)} /> : null;
                  })}
                </View>
                {notice ? <Banner message={t(`paywall.notice.${notice}`)} /> : null}
                <Button label={t(chosen.trialEligible ? 'paywall.cta.trial' : 'paywall.cta.continue')} loading={busy === 'buy'} disabled={busy !== null} onPress={() => void run('buy')} />
                <Text variant="bodySmall" color="textSecondary" align="center">
                  {t(chosen.trialEligible ? `paywall.reassurance.trial.${chosenPlan}` : `paywall.reassurance.direct.${chosenPlan}`, { price: chosen.pkg.product.priceString })}
                </Text>
              </>
            )}
      {/* Liens obligatoires, discrets mais avec une cible tactile pleine. */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', columnGap: theme.spacing.s20 }}>
        {purchasesEnabled ? <FooterLink label={t('paywall.restore')} disabled={busy !== null} onPress={() => void run('restore')} /> : null}
        <FooterLink label={t('paywall.terms')} onPress={() => void Linking.openURL(TERMS_URL)} />
        {privacy ? <FooterLink label={t('paywall.privacy')} onPress={() => void Linking.openURL(privacy)} /> : null}
      </View>
      {busy === 'restore' ? <ActivityIndicator color={theme.colors.accent} accessibilityLabel={t('common.loading')} /> : null}
      {purchasesEnabled ? <Text variant="caption" color="textSecondary" align="center">{t('paywall.legal')}</Text> : null}
    </Screen>
  );
}
