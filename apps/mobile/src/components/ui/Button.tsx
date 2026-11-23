import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from './Text';

export type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
  /** Libellé lu par VoiceOver s'il doit différer du texte affiché. */
  accessibilityLabel?: string;
  testID?: string;
};

/** États : repos, pressé, chargement, désactivé (SPEC §16.5). */
export function Button({ label, onPress, variant = 'primary', loading = false, disabled = false, accessibilityLabel, testID }: ButtonProps) {
  const theme = useTheme();
  const inactive = disabled || loading;
  const background = variant === 'primary' ? theme.colors.accent : 'transparent';
  const textColor = variant === 'primary' ? 'onAccent' : variant === 'secondary' ? 'text' : 'accentText';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.base,
        {
          minHeight: theme.minTouchTarget + theme.spacing.s8,
          paddingHorizontal: theme.spacing.s24,
          borderRadius: theme.radii.pill,
          backgroundColor: background,
          borderWidth: variant === 'secondary' ? theme.borderWidth : 0,
          borderColor: theme.colors.border,
          opacity: disabled ? theme.opacities.disabled : pressed ? theme.opacities.pressed : 1,
        },
      ]}>
      {loading ? (
        <ActivityIndicator color={theme.colors[textColor]} />
      ) : (
        <View>
          <Text variant="heading" color={textColor} align="center">{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({ base: { alignItems: 'center', justifyContent: 'center' } });
