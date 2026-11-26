// Glyphe astrologique du registre, tracé au trait fin dans un repère 24 × 24 (SPEC §17.5).
import type { ColorRole } from '@aurorya/shared';
import { Canvas, Group, Path, Skia } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { type GlyphId, getGlyphPath } from '@/assets/registry';
import { useTheme } from '@/theme/ThemeProvider';

const GLYPH_BOX = 24;
const GLYPH_STROKE = 1.5;

export function Glyph({ id, size, color = 'text' }: { id: GlyphId; size?: number; color?: ColorRole }) {
  const theme = useTheme();
  const side = size ?? theme.spacing.s20;
  const path = useMemo(() => Skia.Path.MakeFromSVGString(getGlyphPath(id)), [id]);
  return (
    <Canvas accessible={false} style={{ width: side, height: side }}>
      {path ? (
        <Group transform={[{ scale: side / GLYPH_BOX }]}>
          <Path path={path} color={theme.colors[color]} style="stroke" strokeWidth={GLYPH_STROKE} strokeCap="round" strokeJoin="round" />
        </Group>
      ) : null}
    </Canvas>
  );
}
