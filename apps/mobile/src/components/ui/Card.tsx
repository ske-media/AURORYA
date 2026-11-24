import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';

/** Surface posée sur le fond. En thème sombre, l'élévation se lit par la surface, sans ombre (SPEC §16.4). */
export function Card({ children, raised = false }: { children: ReactNode; raised?: boolean }) {
  const theme = useTheme();
  return (
    <View
      style={{
        backgroundColor: raised ? theme.colors.surfaceRaised : theme.colors.surface,
        borderColor: theme.colors.border,
        borderWidth: theme.borderWidth,
        borderRadius: theme.radii.lg,
        padding: theme.spacing.s20,
        gap: theme.spacing.s12,
      }}>
      {children}
    </View>
  );
}
