// Icône d'interface du registre, teintée par un rôle de couleur. Décorative : le libellé est porté par le parent.
import type { ColorRole } from '@aurorya/shared';
import { Canvas, ImageSVG, Skia } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { type SvgAssetId, getSvg } from '@/assets/registry';
import { useTheme } from '@/theme/ThemeProvider';

export function Icon({ id, size, color = 'text' }: { id: SvgAssetId; size?: number; color?: ColorRole }) {
  const theme = useTheme();
  const side = size ?? theme.spacing.s20;
  const tint = theme.colors[color];
  const svg = useMemo(() => Skia.SVG.MakeFromString(getSvg(id).replaceAll('currentColor', tint)), [id, tint]);
  return (
    <Canvas accessible={false} style={{ width: side, height: side }}>
      {svg ? <ImageSVG svg={svg} x={0} y={0} width={side} height={side} /> : null}
    </Canvas>
  );
}
