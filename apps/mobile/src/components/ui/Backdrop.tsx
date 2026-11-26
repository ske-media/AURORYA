// Fond (ADR-007, ADR-033) : encre profonde, lueur bleu nuit très douce en haut d'écran, deux fines lignes
// d'orbite en bronze, grain discret.
// Purement décoratif : ne reçoit aucun geste et n'est pas lu par VoiceOver.
import { Canvas, Fill, Image, Oval, RadialGradient, Rect, useImage, vec } from '@shopify/react-native-skia';
import { StyleSheet, useWindowDimensions } from 'react-native';
import { getAsset, isProvisional } from '@/assets/registry';
import { useTheme } from '@/theme/ThemeProvider';

const NEBULA_RADIUS_RATIO = 0.9;
// Orbites : deux ellipses décentrées qui débordent du haut de l'écran, en proportion de sa largeur.
const ORBITS = [{ cx: 0.5, cy: 0.04, rx: 0.72, ry: 0.5 }, { cx: 0.62, cy: -0.02, rx: 0.46, ry: 0.34 }] as const;
const ORBIT_OPACITY = 0.5;

export function Backdrop() {
  const theme = useTheme();
  const { width, height } = useWindowDimensions();
  const grain = useImage(isProvisional('texture-grain') ? null : getAsset('texture-grain'));
  return (
    <Canvas pointerEvents="none" accessible={false} style={StyleSheet.absoluteFill}>
      <Fill color={theme.colors.bg} />
      <Rect x={0} y={0} width={width} height={height} opacity={theme.opacities.nebula}>
        <RadialGradient c={vec(width / 2, 0)} r={width * NEBULA_RADIUS_RATIO} colors={[theme.colors.backdropTint, theme.colors.backdrop, theme.colors.bg]} />
      </Rect>
      {ORBITS.map((o) => (
        <Oval key={o.rx} x={(o.cx - o.rx) * width} y={(o.cy - o.ry) * width} width={o.rx * 2 * width} height={o.ry * 2 * width}
          color={theme.colors.accentMuted} opacity={ORBIT_OPACITY} style="stroke" strokeWidth={theme.borderWidth} />
      ))}
      {grain ? <Image image={grain} x={0} y={0} width={width} height={height} fit="cover" opacity={theme.opacities.grain} /> : null}
    </Canvas>
  );
}
