// Onglet « Mon ciel » (SPEC §7.2) : roue interactive, liste accessible des placements, bandeau si l'heure manque.
import { BODY_NAMES, type ChartPayload, type House, type SectionKey, type ToneMode, formatDegrees, formatHouse, formatPlacement } from '@aurorya/shared';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, View, useWindowDimensions } from 'react-native';
import { type WheelBodyId, ZodiacWheel } from '@/components/astro/ZodiacWheel';
import type { AssetId } from '@/assets/registry';
import { Banner, Button, Card, EmptyState, ModeSelector, PhotoHalo, Screen, Text } from '@/components/ui';
import { SectionCards } from '@/features/reading/SectionCards';
import { feedback } from '@/services/feedback';
import { NotConfiguredError, useChartSummaries, useCurrentChart } from '@/services/query';
import { useOnboarding } from '@/store/onboarding';
import { useTheme } from '@/theme/ThemeProvider';
import { wheelSize } from './wheel-geometry';

type Locale = 'fr' | 'en';
/** Section de la lecture complète où un corps est approfondi (SPEC §7.4). */
const SECTION_OF: Readonly<Record<WheelBodyId, SectionKey>> = {
  sun: 'big_three', moon: 'inner_world', mercury: 'mind', venus: 'love', mars: 'drive', jupiter: 'growth',
  saturn: 'growth', uranus: 'synthesis', neptune: 'synthesis', pluto: 'shadow', north_node: 'growth',
};
// Le Nœud nord n'a pas de photo au registre.
const photoOfBody = (id: WheelBodyId): AssetId | null => (id === 'north_node' ? null : `photo-body-${id}`);
const placementLine = (locale: Locale, body: ChartPayload['bodies'][number], retrogradeLabel: string): string =>
  `${formatPlacement(locale, body.id, body.sign, (body.house as House | null) ?? null)} · ${formatDegrees(body.degree, body.minute)}${body.retrograde ? ` · ${retrogradeLabel}` : ''}`;

export function SkyScreen() {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const locale: Locale = i18n.language === 'en' ? 'en' : 'fr';
  const query = useCurrentChart();
  const [selected, setSelected] = useState<WheelBodyId | null>(null);
  const [asList, setAsList] = useState(false);
  const router = useRouter();
  const defaultMode = useOnboarding((state) => state.draft.toneMode);
  const [mode, setMode] = useState<ToneMode>(defaultMode);
  const summaries = useChartSummaries(query.data?.id ?? null, mode);

  const header = <Text variant="title1" accessibilityRole="header">{t('sky.title')}</Text>;
  if (query.isPending) return <Screen>{header}<ActivityIndicator color={theme.colors.accent} accessibilityLabel={t('common.loading')} /></Screen>;
  if (query.isError) {
    const unconfigured = query.error instanceof NotConfiguredError;
    return (
      <Screen>{header}
        <EmptyState title={t(unconfigured ? 'onboarding.computing.state.unconfigured.title' : 'sky.state.error.title')} body={t(unconfigured ? 'onboarding.computing.state.unconfigured.body' : 'sky.state.error.body')}
          {...(unconfigured ? {} : { action: { label: t('common.retry'), onPress: () => void query.refetch() } })} />
      </Screen>
    );
  }
  if (!query.data) return <Screen>{header}<EmptyState title={t('sky.state.empty.title')} body={t('sky.state.empty.body')} /></Screen>;

  const { chart } = query.data;
  const body = selected ? chart.bodies.find((b) => b.id === selected) : undefined;
  const bodyAspects = selected ? chart.aspects.filter((a) => a.a === selected || a.b === selected) : [];
  const sun = chart.bodies.find((b) => b.id === 'sun');
  const moon = chart.bodies.find((b) => b.id === 'moon');
  const summary = [sun ? formatPlacement(locale, 'sun', sun.sign, null) : null, moon && !moon.signUncertain ? formatPlacement(locale, 'moon', moon.sign, null) : null, chart.angles ? formatPlacement(locale, 'asc', chart.angles.asc.sign, null) : null]
    .filter((x): x is string => x !== null).join(', ');

  return (
    <Screen>
      {header}
      <ModeSelector value={mode} onChange={setMode} />
      {chart.angles === null ? <Banner message={t('sky.timeUnknown.banner')} /> : null}
      {asList ? (
        <View style={{ gap: theme.spacing.s8 }}>
          {chart.bodies.map((b) => (
            <Pressable key={b.id} accessibilityRole="button" accessibilityState={{ selected: selected === b.id }} onPress={() => setSelected(selected === b.id ? null : b.id)}>
              <Card glow={selected === b.id}><Text>{placementLine(locale, b, t('sky.retrograde'))}{b.signUncertain ? ` · ${t('sky.signUncertain')}` : ''}</Text></Card>
            </Pressable>
          ))}
          {chart.angles ? <Card><Text>{formatPlacement(locale, 'asc', chart.angles.asc.sign, null)} · {formatDegrees(chart.angles.asc.degree, chart.angles.asc.minute)}</Text></Card> : null}
          {chart.angles ? <Card><Text>{formatPlacement(locale, 'mc', chart.angles.mc.sign, null)} · {formatDegrees(chart.angles.mc.degree, chart.angles.mc.minute)}</Text></Card> : null}
        </View>
      ) : (
        <View style={{ alignItems: 'center' }}>
          <ZodiacWheel chart={chart} size={wheelSize(width, theme.screenMargin)} selected={selected} onSelect={setSelected} accessibilityLabel={t('sky.wheelLabel', { summary })} />
        </View>
      )}
      <Button variant="secondary" label={t(asList ? 'sky.showWheel' : 'sky.showList')} onPress={() => setAsList((v) => !v)} />
      {body ? (
        <Card raised glow>
          {photoOfBody(body.id) ? <PhotoHalo id={photoOfBody(body.id) as AssetId} height={theme.spacing.s56 * 2} /> : null}
          <Text variant="label" color="accent">{BODY_NAMES[locale][body.id]}</Text>
          <Text variant="title2">{formatPlacement(locale, body.id, body.sign, null)}</Text>
          <Text variant="numeric" color="textSecondary">
            {body.house ? t('sky.houseLabel', { house: formatHouse(locale, body.house as House), degrees: formatDegrees(body.degree, body.minute) }) : formatDegrees(body.degree, body.minute)}
            {body.retrograde ? ` · ${t('sky.retrograde')}` : ''}
          </Text>
          {/* L'interprétation suit le ton choisi : elle change dès qu'on change de mode. */}
          {summaries.isPending ? <ActivityIndicator color={theme.colors.accent} accessibilityLabel={t('common.loading')} />
            : <Text color={summaries.data?.summaries[`placement:${body.id}`] ? 'text' : 'textSecondary'}>{summaries.data?.summaries[`placement:${body.id}`] ?? t('sky.summaryUnavailable')}</Text>}
          {bodyAspects.length > 0 ? <Text variant="label" color="textSecondary">{t('sky.aspectsLabel')}</Text> : null}
          {bodyAspects.map((a) => {
            const other = a.a === body.id ? a.b : a.a;
            return <Text key={`${a.a}-${a.b}`} variant="bodySmall" color="textSecondary">{t(`sky.aspect.${a.type}`)} · {BODY_NAMES[locale][other]} · {t('sky.orb', { orb: a.orb.toFixed(1) })}{a.applying === null ? '' : ` · ${t(a.applying ? 'sky.applying' : 'sky.separating')}`}</Text>;
          })}
          {/* Lien de texte : un bouton plein couperait la phrase en deux lignes. */}
          <Pressable accessibilityRole="link" onPress={() => { feedback.tap(); router.push(`/reading/${SECTION_OF[body.id]}?mode=${mode}`); }}
            style={{ minHeight: theme.minTouchTarget, justifyContent: 'center' }}>
            <Text variant="bodySmall" color="accent">{`${t('sky.deepen')} →`}</Text>
          </Pressable>
        </Card>
      ) : null}
      <SectionCards mode={mode} />
    </Screen>
  );
}
