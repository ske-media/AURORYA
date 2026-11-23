// Cadre d'écran : marges, zones sûres, défilement, fond (SPEC §16.5).
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';

export function Screen({ children, scroll = true }: { children: ReactNode; scroll?: boolean }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const padding = {
    paddingTop: insets.top + theme.spacing.s24,
    paddingBottom: insets.bottom + theme.spacing.s32,
    paddingHorizontal: theme.screenMargin,
    gap: theme.spacing.s24,
  };
  if (!scroll) return <View style={[styles.fill, { backgroundColor: theme.colors.bg }, padding]}>{children}</View>;
  return (
    <ScrollView style={[styles.fill, { backgroundColor: theme.colors.bg }]} contentContainerStyle={padding}>
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
