import { View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Button } from './Button';
import { Text } from './Text';

export type EmptyStateProps = { title: string; body: string; action?: { label: string; onPress: () => void } };

/** État vide ou d'erreur : message humain et, si possible, une action (SPEC §6.2). */
export function EmptyState({ title, body, action }: EmptyStateProps) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing.s12, paddingVertical: theme.spacing.s40 }} accessibilityRole="summary">
      <Text variant="title2" align="center">{title}</Text>
      <Text color="textSecondary" align="center">{body}</Text>
      {action ? <Button label={action.label} onPress={action.onPress} variant="secondary" /> : null}
    </View>
  );
}
