import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * Surface posée sur le fond. En thème sombre, l'élévation se lit par la surface et un fin reflet intérieur,
 * jamais par une ombre portée (SPEC §16.4). `glow` ajoute une bordure d'accent atténuée.
 */
export function Card({ children, raised = false, glow = false }: { children: ReactNode; raised?: boolean; glow?: boolean }) {
  const theme = useTheme();
  return (
    <View
      style={{
        backgroundColor: raised || glow ? theme.colors.surfaceRaised : theme.colors.surface,
        borderColor: glow ? theme.colors.accentMuted : theme.colors.border,
        borderWidth: theme.borderWidth,
        borderRadius: theme.radii.lg,
        padding: theme.spacing.s20,
        gap: theme.spacing.s12,
        overflow: 'hidden',
      }}>
      {raised || glow ? <View pointerEvents="none" style={[styles.reflet, { height: theme.borderWidth, backgroundColor: theme.colors.highlight }]} /> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({ reflet: { position: 'absolute', top: 0, left: 0, right: 0 } });
