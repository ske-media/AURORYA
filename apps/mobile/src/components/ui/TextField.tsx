import { TextInput, type TextInputProps, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from './Text';

export type TextFieldProps = Omit<TextInputProps, 'style' | 'placeholderTextColor'> & { label: string; error?: string | null };

/** Champ de saisie : libellé toujours visible, erreur annoncée à VoiceOver. */
export function TextField({ label, error, ...rest }: TextFieldProps) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing.s8 }}>
      <Text variant="label" color="textSecondary">{label}</Text>
      <TextInput
        accessibilityLabel={label}
        maxFontSizeMultiplier={theme.maxFontScale}
        placeholderTextColor={theme.colors.textSecondary}
        selectionColor={theme.colors.accent}
        {...rest}
        style={[theme.typography.body, {
          minHeight: theme.minTouchTarget + theme.spacing.s8, paddingHorizontal: theme.spacing.s16, color: theme.colors.text,
          backgroundColor: theme.colors.surface, borderRadius: theme.radii.md, borderWidth: theme.borderWidth,
          borderColor: error ? theme.colors.danger : theme.colors.border,
        }]}
      />
      {error ? <Text variant="bodySmall" color="danger" accessibilityRole="alert">{error}</Text> : null}
    </View>
  );
}
