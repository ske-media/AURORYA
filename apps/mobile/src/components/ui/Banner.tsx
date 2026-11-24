import { View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from './Text';

/** Bandeau discret (hors ligne, heure inconnue…). */
export function Banner({ message }: { message: string }) {
  const theme = useTheme();
  return (
    <View
      accessibilityRole="alert"
      style={{ backgroundColor: theme.colors.surfaceRaised, borderRadius: theme.radii.md, padding: theme.spacing.s12 }}>
      <Text variant="bodySmall" color="textSecondary">{message}</Text>
    </View>
  );
}
