// Thème de l'app (SPEC §16, A-005) : tokens typés, StyleSheet, aucun style en dur dans les composants.
import {
  BORDER_WIDTH, type ColorScheme, MAX_FONT_SCALE, MIN_TOUCH_TARGET, SCREEN_MARGIN, type TextVariant, type ThemeName,
  colorSchemes, durations, easings, fontFamilies, opacities, radii, spacing, textStyles,
} from '@aurorya/shared';
import { type ReactNode, createContext, useContext, useMemo } from 'react';
import type { TextStyle } from 'react-native';

const resolveTextStyle = (variant: TextVariant): TextStyle => {
  const token = textStyles[variant];
  return {
    fontFamily: fontFamilies[token.font],
    fontSize: token.fontSize,
    lineHeight: token.lineHeight,
    ...(token.letterSpacingEm !== undefined ? { letterSpacing: token.letterSpacingEm * token.fontSize } : {}),
    ...(token.uppercase ? { textTransform: 'uppercase' as const } : {}),
    ...(token.tabularNumbers ? { fontVariant: ['tabular-nums' as const] } : {}),
  };
};

const typography = Object.fromEntries(
  (Object.keys(textStyles) as TextVariant[]).map((variant) => [variant, resolveTextStyle(variant)]),
) as Record<TextVariant, TextStyle>;

export type Theme = Readonly<{
  name: ThemeName;
  colors: ColorScheme;
  typography: Readonly<Record<TextVariant, TextStyle>>;
  spacing: typeof spacing;
  radii: typeof radii;
  durations: typeof durations;
  easings: typeof easings;
  opacities: typeof opacities;
  screenMargin: number;
  borderWidth: number;
  minTouchTarget: number;
  maxFontScale: number;
}>;

const buildTheme = (name: ThemeName): Theme => ({
  name, colors: colorSchemes[name], typography, spacing, radii, durations, easings, opacities,
  screenMargin: SCREEN_MARGIN, borderWidth: BORDER_WIDTH, minTouchTarget: MIN_TOUCH_TARGET, maxFontScale: MAX_FONT_SCALE,
});

const ThemeContext = createContext<Theme>(buildTheme('dark'));

/** Sombre uniquement au lancement (D-024). Le thème clair s'activera par drapeau distant en V1.1. */
export function ThemeProvider({ children, name = 'dark' }: { children: ReactNode; name?: ThemeName }) {
  const theme = useMemo(() => buildTheme(name), [name]);
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export const useTheme = (): Theme => useContext(ThemeContext);
