// Seul composant de texte de l'app (SPEC §16.3) : aucune taille de police ailleurs.
import type { ColorRole, TextVariant } from '@aurorya/shared';
import { Text as NativeText, type TextProps as NativeTextProps } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';

export type TextProps = Omit<NativeTextProps, 'style'> & {
  variant?: TextVariant;
  color?: ColorRole;
  align?: 'left' | 'center' | 'right';
};

export function Text({ variant = 'body', color = 'text', align = 'left', ...rest }: TextProps) {
  const theme = useTheme();
  return (
    <NativeText
      maxFontSizeMultiplier={theme.maxFontScale}
      {...rest}
      style={[theme.typography[variant], { color: theme.colors[color], textAlign: align }]}
    />
  );
}
