// Icône d'interface du registre, teintée par un rôle de couleur. Décorative : le libellé est porté par le parent.
import type { ColorRole } from '@aurorya/shared';
import { Canvas, Group, ImageSVG, Skia } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { type SvgAssetId, getSvg } from '@/assets/registry';
import { useTheme } from '@/theme/ThemeProvider';

const ICON_BOX = 24;

export function Icon({ id, size, color = 'text' }: { id: SvgAssetId; size?: number; color?: ColorRole }) {
  const theme = useTheme();
  const side = size ?? theme.spacing.s20;
  const tint = theme.colors[color];
  const svg = useMemo(() => Skia.SVG.MakeFromString(getSvg(id).replaceAll('currentColor', tint)), [id, tint]);
  return (
    <Canvas accessible={false} style={{ width: side, height: side }}>
      {/* L'icône est dessinée dans son repère d'origine (24 × 24), puis mise à l'échelle : aucun rognage. */}
      {svg ? <Group transform={[{ scale: side / ICON_BOX }]}><ImageSVG svg={svg} x={0} y={0} width={ICON_BOX} height={ICON_BOX} /></Group> : null}
    </Canvas>
  );
}
