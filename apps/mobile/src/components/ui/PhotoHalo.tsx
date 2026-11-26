// Photo d'ambiance du registre, fondue derrière un en-tête (ADR-007). Décorative, sans geste ni lecture.
import { Image, StyleSheet, View } from 'react-native';
import { type AssetId, getAsset, isProvisional } from '@/assets/registry';
import { useTheme } from '@/theme/ThemeProvider';

export function PhotoHalo({ id, height, strength = 'halo' }: { id: AssetId; height: number; strength?: 'halo' | 'backdrop' }) {
  const theme = useTheme();
  // Un gabarit provisoire porte son nom en toutes lettres : il ne s'affiche pas.
  if (isProvisional(id)) return null;
  return (
    <View pointerEvents="none" accessible={false} style={[styles.box, { height, borderRadius: theme.radii.xl }]}>
      <Image source={getAsset(id)} resizeMode="cover" style={[styles.image, { opacity: strength === 'halo' ? theme.opacities.photoHalo : theme.opacities.photoBackdrop }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { position: 'absolute', top: 0, left: 0, right: 0, overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
});
