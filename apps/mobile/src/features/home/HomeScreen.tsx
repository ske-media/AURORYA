// Onglet « Accueil » (SPEC §27.3, maquettes du fondateur) : salutation, horoscope du jour en tête, raccourcis,
// puis la liste des fonctions annoncées. Celles-ci sont marquées « à venir » et ne mènent nulle part (ADR-032).
import { SIGN_NAMES } from '@aurorya/shared';
import { type Href, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, View } from 'react-native';
import type { GlyphId } from '@/assets/registry';
import { Glyph } from '@/components/astro/Glyph';
import { Button, Card, Screen, Text } from '@/components/ui';
import { toIsoDate } from '@/features/onboarding/draft';
import { feedback } from '@/services/feedback';
import { useDaily } from '@/services/query';
import { useOnboarding } from '@/store/onboarding';
import { useTheme } from '@/theme/ThemeProvider';

const SHORTCUTS: readonly { key: 'chart' | 'compatibility'; glyph: GlyphId; href: Href }[] = [
  { key: 'chart', glyph: 'glyph-body-sun', href: '/sky' },
  { key: 'compatibility', glyph: 'glyph-body-venus', href: '/groups' },
];
/** Fonctions de la V2 (SPEC §27.2), dans l'ordre du menu des maquettes. */
const UPCOMING = ['memory', 'timeMachine', 'cosmicYear', 'letters', 'radio', 'journal', 'community'] as const;
const EXCERPT_LINES = 3;

export function HomeScreen() {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const { draft } = useOnboarding();
  const locale = i18n.language === 'en' ? 'en' : 'fr';
  const today = new Date();
  const daily = useDaily(toIsoDate(today), draft.toneMode);
  const name = draft.firstName.trim();
  const horoscope = daily.data?.signHoroscope ?? null;

  return (
    <Screen>
      <View style={{ gap: theme.spacing.s4 }}>
        <Text variant="title1" accessibilityRole="header">{name ? t('home.greeting', { name }) : t('home.greetingGeneric')}</Text>
        <Text variant="label" color="textSecondary">{new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(today)}</Text>
      </View>
      <Card raised glow>
        <Text variant="label" color="accent">{t('home.horoscopeLabel')}</Text>
        {daily.isPending ? <ActivityIndicator color={theme.colors.accent} accessibilityLabel={t('common.loading')} />
          : horoscope ? (
            <>
              <Text variant="title2">{horoscope.headline}</Text>
              <Text color="textSecondary" numberOfLines={EXCERPT_LINES}>{horoscope.body}</Text>
              <Text variant="caption" color="textSecondary">{SIGN_NAMES[locale][horoscope.sign]}</Text>
            </>
          ) : <Text color="textSecondary">{t(daily.isError ? 'today.state.error.body' : 'today.state.noHoroscope')}</Text>}
        <Button label={t('home.discover')} onPress={() => router.push('/today')} />
      </Card>
      <View style={{ flexDirection: 'row', gap: theme.spacing.s12 }}>
        {SHORTCUTS.map((item) => (
          <Pressable key={item.key} accessibilityRole="button" accessibilityLabel={t(`home.shortcut.${item.key}`)} style={{ flex: 1 }}
            onPress={() => { feedback.tap(); router.push(item.href); }}>
            <Card>
              <View style={{ alignItems: 'center', gap: theme.spacing.s8, paddingVertical: theme.spacing.s8 }}>
                <Glyph id={item.glyph} size={theme.spacing.s32} color="accent" />
                <Text variant="title2" align="center">{t(`home.shortcut.${item.key}`)}</Text>
              </View>
            </Card>
          </Pressable>
        ))}
      </View>
      <View style={{ gap: theme.spacing.s8 }}>
        <Text variant="label" color="textSecondary">{t('home.upcoming.title')}</Text>
        <Card>
          {UPCOMING.map((key) => (
            <View key={key} accessible accessibilityLabel={`${t(`home.upcoming.${key}`)}, ${t('home.upcoming.badge')}`}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: theme.minTouchTarget }}>
              <Text color="textSecondary">{t(`home.upcoming.${key}`)}</Text>
              <Text variant="caption" color="accentText">{t('home.upcoming.badge')}</Text>
            </View>
          ))}
        </Card>
      </View>
    </Screen>
  );
}
