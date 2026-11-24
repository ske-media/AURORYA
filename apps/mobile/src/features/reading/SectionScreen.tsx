// Une section de la lecture complète (SPEC §7.4). Le serveur décide du droit : texte complet, ou accroche et zone floutée.
import { SECTION_KEYS, type SectionKey, TONE_MODES, type ToneMode } from '@aurorya/shared';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator } from 'react-native';
import { Banner, Card, EmptyState, Screen, Text } from '@/components/ui';
import { BlurredFiller } from '@/components/ui/BlurredFiller';
import { ApiError } from '@/services/api-client';
import { useCurrentChart, useSection } from '@/services/query';
import { useTheme } from '@/theme/ThemeProvider';

const isSectionKey = (value: unknown): value is SectionKey => (SECTION_KEYS as readonly unknown[]).includes(value);
const isToneMode = (value: unknown): value is ToneMode => (TONE_MODES as readonly unknown[]).includes(value);

export function SectionScreen() {
  const params = useLocalSearchParams<{ sectionKey: string; mode: string }>();
  const key: SectionKey = isSectionKey(params.sectionKey) ? params.sectionKey : 'big_three';
  const mode: ToneMode = isToneMode(params.mode) ? params.mode : 'soft';
  const { t } = useTranslation();
  const theme = useTheme();
  const query = useSection(key, mode);
  const chart = useCurrentChart();

  const header = <Text variant="title1" accessibilityRole="header">{t(`reading.section.${key}`)}</Text>;
  if (query.isPending) return <Screen>{header}<ActivityIndicator color={theme.colors.accent} accessibilityLabel={t('common.loading')} /></Screen>;
  if (query.isError) {
    const noRoast = query.error instanceof ApiError && query.error.code === 'NOT_FOUND';
    return (
      <Screen>{header}
        <EmptyState title={t(noRoast ? 'reading.state.noRoast.title' : 'reading.state.error.title')} body={t(noRoast ? 'reading.state.noRoast.body' : 'reading.state.error.body')}
          {...(noRoast ? {} : { action: { label: t('common.retry'), onPress: () => void query.refetch() } })} />
      </Screen>
    );
  }
  const section = query.data;
  return (
    <Screen>
      {header}
      {chart.data && chart.data.chart.angles === null ? <Banner message={t('reading.noTimeNote')} /> : null}
      <Text variant="heading">{section.hook}</Text>
      {section.locked ? (
        <>
          <BlurredFiller />
          <Card raised><Text color="textSecondary">{t('reading.locked')}</Text></Card>
        </>
      ) : (
        <>
          {section.paragraphs.map((paragraph) => <Text key={paragraph}>{paragraph}</Text>)}
          <Card>
            <Text variant="label" color="accent">{t('reading.anchorsLabel')}</Text>
            {section.anchors.map((a) => <Text key={a.anchor} variant="bodySmall" color="textSecondary">{a.label}</Text>)}
          </Card>
        </>
      )}
    </Screen>
  );
}
