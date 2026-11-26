// Cadre d'écran : marges, zones sûres, défilement, fond nébuleux (SPEC §16.5, ADR-007).
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { Backdrop } from './Backdrop';

export function Screen({ children, scroll = true }: { children: ReactNode; scroll?: boolean }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const padding = {
    paddingTop: insets.top + theme.spacing.s24,
    paddingBottom: insets.bottom + theme.spacing.s32,
    paddingHorizontal: theme.screenMargin,
    gap: theme.spacing.s24,
  };
  return (
    <View style={[styles.fill, { backgroundColor: theme.colors.bg }]}>
      <Backdrop />
      {scroll ? <ScrollView style={styles.fill} contentContainerStyle={padding}>{children}</ScrollView> : <View style={[styles.fill, padding]}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
