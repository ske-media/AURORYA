// Sélecteur de ton : Lune (doux), Mars (cash), Saturne (expert). La pilule active glisse d'un segment à l'autre.
import { TONE_MODES, type ToneMode } from '@aurorya/shared';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import type { GlyphId } from '@/assets/registry';
import { Glyph } from '@/components/astro/Glyph';
import { feedback } from '@/services/feedback';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from './Text';

const MODE_GLYPHS: Readonly<Record<ToneMode, GlyphId>> = { soft: 'glyph-mode-soft', cash: 'glyph-mode-cash', expert: 'glyph-mode-expert' };

export type ModeSelectorProps = { value: ToneMode; onChange: (mode: ToneMode) => void; showDescription?: boolean; disabled?: boolean };

export function ModeSelector({ value, onChange, showDescription = false, disabled = false }: ModeSelectorProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const reducedMotion = useReducedMotion();
  const [width, setWidth] = useState(0);
  const inset = theme.spacing.s4;
  const segment = width > 0 ? (width - inset * 2) / TONE_MODES.length : 0;
  const index = TONE_MODES.indexOf(value);
  const offset = useSharedValue(0);
  useEffect(() => {
    const target = index * segment;
    offset.value = reducedMotion ? target : withTiming(target, { duration: theme.durations.fast });
  }, [index, segment, reducedMotion, offset, theme.durations.fast]);
  const pillStyle = useAnimatedStyle(() => ({ transform: [{ translateX: offset.value }] }));

  return (
    <View style={{ gap: theme.spacing.s8 }}>
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel={t('modes.label')}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        style={[styles.track, { padding: inset, borderRadius: theme.radii.pill, borderWidth: theme.borderWidth, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, opacity: disabled ? theme.opacities.disabled : 1 }]}>
        {segment > 0 ? (
          <Animated.View
            pointerEvents="none"
            style={[styles.pill, pillStyle, { top: inset, bottom: inset, left: inset, width: segment, borderRadius: theme.radii.pill, borderWidth: theme.borderWidth, borderColor: theme.colors.accentMuted, backgroundColor: theme.colors.surfaceRaised }]}
          />
        ) : null}
        {TONE_MODES.map((mode) => {
          const selected = mode === value;
          return (
            <Pressable
              key={mode}
              accessibilityRole="radio"
              accessibilityState={{ selected, disabled }}
              accessibilityLabel={`${t(`modes.${mode}.name`)}. ${t(`modes.${mode}.description`)}`}
              disabled={disabled}
              onPress={() => { if (!selected) { feedback.select(); onChange(mode); } }}
              style={[styles.segment, { minHeight: theme.minTouchTarget, gap: theme.spacing.s8 }]}>
              <Glyph id={MODE_GLYPHS[mode]} size={theme.spacing.s16} color={selected ? 'accent' : 'textSecondary'} />
              <Text variant="bodySmall" color={selected ? 'accentText' : 'textSecondary'}>{t(`modes.${mode}.name`)}</Text>
            </Pressable>
          );
        })}
      </View>
      {showDescription ? <Text variant="caption" color="textSecondary" align="center">{t(`modes.${value}.description`)}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row' },
  pill: { position: 'absolute' },
  segment: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
});
