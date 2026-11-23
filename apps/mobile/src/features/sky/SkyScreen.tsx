// Onglet « Mon ciel » (SPEC §7.2) : roue interactive, liste accessible des placements, bandeau si l'heure manque.
import { BODY_NAMES, type ChartPayload, type House, formatDegrees, formatHouse, formatPlacement } from '@aurorya/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, View, useWindowDimensions } from 'react-native';
import { type WheelBodyId, ZodiacWheel } from '@/components/astro/ZodiacWheel';
import { Banner, Button, Card, EmptyState, Screen, Text } from '@/components/ui';
import { NotConfiguredError, useCurrentChart } from '@/services/query';
import { useTheme } from '@/theme/ThemeProvider';
import { wheelSize } from './wheel-geometry';

type Locale = 'fr' | 'en';
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
      {chart.angles === null ? <Banner message={t('sky.timeUnknown.banner')} /> : null}
      {asList ? (
        <View style={{ gap: theme.spacing.s8 }}>
          {chart.bodies.map((b) => <Card key={b.id}><Text>{placementLine(locale, b, t('sky.retrograde'))}{b.signUncertain ? ` · ${t('sky.signUncertain')}` : ''}</Text></Card>)}
          {chart.angles ? <Card><Text>{formatPlacement(locale, 'asc', chart.angles.asc.sign, null)} · {formatDegrees(chart.angles.asc.degree, chart.angles.asc.minute)}</Text></Card> : null}
          {chart.angles ? <Card><Text>{formatPlacement(locale, 'mc', chart.angles.mc.sign, null)} · {formatDegrees(chart.angles.mc.degree, chart.angles.mc.minute)}</Text></Card> : null}
        </View>
      ) : (
        <View style={{ alignItems: 'center' }}>
          <ZodiacWheel chart={chart} size={wheelSize(width, theme.screenMargin)} selected={selected} onSelect={setSelected} accessibilityLabel={t('sky.wheelLabel', { summary })} />
        </View>
      )}
      <Button variant="secondary" label={t(asList ? 'sky.showWheel' : 'sky.showList')} onPress={() => setAsList((v) => !v)} />
      {body && !asList ? (
        <Card raised>
          <Text variant="label" color="accent">{BODY_NAMES[locale][body.id]}</Text>
          <Text variant="title2">{placementLine(locale, body, t('sky.retrograde'))}</Text>
          {body.house ? <Text color="textSecondary">{formatHouse(locale, body.house as House)}</Text> : null}
          {bodyAspects.map((a) => {
            const other = a.a === body.id ? a.b : a.a;
            return <Text key={`${a.a}-${a.b}`} variant="bodySmall" color="textSecondary">{t(`sky.aspect.${a.type}`)} · {BODY_NAMES[locale][other]} · {t('sky.orb', { orb: a.orb.toFixed(1) })}{a.applying === null ? '' : ` · ${t(a.applying ? 'sky.applying' : 'sky.separating')}`}</Text>;
          })}
        </Card>
      ) : null}
    </Screen>
  );
}
