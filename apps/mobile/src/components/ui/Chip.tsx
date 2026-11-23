import { Pressable } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from './Text';

export type ChipProps = { label: string; selected?: boolean; onPress: () => void; testID?: string };

/** Puce à choix. L'état choisi ne repose pas sur la seule couleur : il est aussi annoncé à VoiceOver. */
export function Chip({ label, selected = false, onPress, testID }: ChipProps) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={onPress}
      testID={testID}
      style={{
        minHeight: theme.minTouchTarget,
        paddingHorizontal: theme.spacing.s16,
        justifyContent: 'center',
        borderRadius: theme.radii.pill,
        borderWidth: theme.borderWidth,
        borderColor: selected ? theme.colors.accent : theme.colors.border,
        backgroundColor: selected ? theme.colors.surfaceRaised : 'transparent',
      }}>
      <Text variant="bodySmall" color={selected ? 'accentText' : 'text'}>{label}</Text>
    </Pressable>
  );
}
