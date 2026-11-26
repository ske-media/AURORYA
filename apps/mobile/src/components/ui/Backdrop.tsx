// Fond nébuleux (ADR-007) : nuit profonde, lueur violette très douce en haut d'écran, grain discret.
// Purement décoratif : ne reçoit aucun geste et n'est pas lu par VoiceOver.
import { Canvas, Fill, Image, RadialGradient, Rect, useImage, vec } from '@shopify/react-native-skia';
import { StyleSheet, useWindowDimensions } from 'react-native';
import { getAsset } from '@/assets/registry';
import { useTheme } from '@/theme/ThemeProvider';

const NEBULA_RADIUS_RATIO = 0.9;

export function Backdrop() {
  const theme = useTheme();
  const { width, height } = useWindowDimensions();
  const grain = useImage(getAsset('texture-grain'));
  return (
    <Canvas pointerEvents="none" accessible={false} style={StyleSheet.absoluteFill}>
      <Fill color={theme.colors.bg} />
      <Rect x={0} y={0} width={width} height={height} opacity={theme.opacities.nebula}>
        <RadialGradient c={vec(width / 2, 0)} r={width * NEBULA_RADIUS_RATIO} colors={[theme.colors.backdropTint, theme.colors.backdrop, theme.colors.bg]} />
      </Rect>
      {grain ? <Image image={grain} x={0} y={0} width={width} height={height} fit="cover" opacity={theme.opacities.grain} /> : null}
    </Canvas>
  );
}
