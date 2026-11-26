import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';
import type { SvgAssetId } from '@/assets/registry';
import { feedback } from '@/services/feedback';
import { useTheme } from '@/theme/ThemeProvider';
import { Icon } from './Icon';
import { Text } from './Text';

export type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
  /** Icône du registre, affichée à gauche du libellé. */
  icon?: SvgAssetId;
  /** Libellé lu par VoiceOver s'il doit différer du texte affiché. */
  accessibilityLabel?: string;
  testID?: string;
};

/** États : repos, pressé, chargement, désactivé (SPEC §16.5). Le bouton principal porte un halo et un micro-ressort. */
export function Button({ label, onPress, variant = 'primary', loading = false, disabled = false, icon, accessibilityLabel, testID }: ButtonProps) {
  const theme = useTheme();
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const springStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const inactive = disabled || loading;
  const primary = variant === 'primary';
  const textColor = primary ? 'onAccent' : variant === 'secondary' ? 'text' : 'accentText';
  const press = (to: number): void => {
    if (primary && !reducedMotion) scale.value = withSpring(to);
  };
  return (
    // Le ressort et le halo vivent sur l'enveloppe ; l'état pressé reste géré par le Pressable.
    <Animated.View
      style={[
        springStyle,
        { borderRadius: theme.radii.pill },
        // Halo lumineux du bouton principal : une lueur, pas une ombre portée.
        primary && !inactive ? { shadowColor: theme.colors.glow, shadowOpacity: 1, shadowRadius: theme.spacing.s16, shadowOffset: { width: 0, height: 0 } } : null,
      ]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityState={{ disabled: inactive, busy: loading }}
        disabled={inactive}
        onPressIn={() => press(theme.motion.pressScale)}
        onPressOut={() => press(1)}
        onPress={() => { feedback.tap(); onPress(); }}
        testID={testID}
        style={({ pressed }) => [
          styles.base,
          {
            minHeight: theme.minTouchTarget + theme.spacing.s8,
            paddingHorizontal: theme.spacing.s24,
            borderRadius: theme.radii.pill,
            backgroundColor: primary ? theme.colors.accentFill : 'transparent',
            borderWidth: variant === 'secondary' ? theme.borderWidth : 0,
            borderColor: theme.colors.border,
            opacity: disabled ? theme.opacities.disabled : pressed ? theme.opacities.pressed : 1,
          },
        ]}>
      {loading ? (
        <ActivityIndicator color={theme.colors[textColor]} />
      ) : (
        <View style={[styles.row, { gap: theme.spacing.s8 }]}>
          {icon ? <Icon id={icon} color={textColor} /> : null}
          <Text variant="heading" color={textColor} align="center">{label}</Text>
        </View>
      )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({ base: { alignItems: 'center', justifyContent: 'center' }, row: { flexDirection: 'row', alignItems: 'center' } });
