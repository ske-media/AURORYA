// Roue astrale (SPEC §7.2, §16.6), dessinée avec Skia. Toute la géométrie vient de wheel-geometry.ts ;
// ce composant ne fait aucun calcul astrologique. Les glyphes viennent du registre, jamais d'Unicode.
import { type ChartPayload, SIGN_IDS } from '@aurorya/shared';
import { Canvas, Circle, DashPathEffect, Group, Line, Path, Skia, vec } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { type GlyphId, getGlyphPath } from '@/assets/registry';
import { BODY_GLYPH_SIZE, WHEEL_RADII, aspectOpacity, minGlyphGap, pointAt, spreadGlyphs } from '@/features/sky/wheel-geometry';
import { useTheme } from '@/theme/ThemeProvider';

export type WheelBodyId = ChartPayload['bodies'][number]['id'];
type Props = { chart: ChartPayload; size: number; selected: WheelBodyId | null; onSelect: (id: WheelBodyId | null) => void; accessibilityLabel: string };

const GLYPH_BOX = 24;
const SIGN_GLYPH_SIZE = 16;
const MAX_ASPECT_ORB = 10;
const glyphIdOfBody = (id: WheelBodyId): GlyphId => `glyph-body-${id === 'north_node' ? 'north-node' : id}` as GlyphId;

function Glyph({ id, x, y, size, color, opacity = 1 }: { id: GlyphId; x: number; y: number; size: number; color: string; opacity?: number }) {
  const path = useMemo(() => Skia.Path.MakeFromSVGString(getGlyphPath(id)), [id]);
  if (!path) return null;
  const scale = size / GLYPH_BOX;
  return (
    <Group transform={[{ translateX: x - size / 2 }, { translateY: y - size / 2 }, { scale }]} opacity={opacity}>
      <Path path={path} style="stroke" strokeWidth={1.5} strokeCap="round" strokeJoin="round" color={color} />
    </Group>
  );
}

export function ZodiacWheel({ chart, size, selected, onSelect, accessibilityLabel }: Props) {
  const theme = useTheme();
  const c = size / 2;
  // Référence : l'Ascendant à gauche ; sans heure exacte, le Bélier à gauche.
  const reference = chart.angles?.asc.longitude ?? 0;
  const at = (longitude: number, radius: number) => pointAt(longitude, reference, size, radius);
  const placed = useMemo(() => spreadGlyphs(chart.bodies.map((b) => ({ id: b.id, longitude: b.longitude })), minGlyphGap(size)), [chart.bodies, size]);
  const longitudeOf = (id: string): number | null =>
    chart.bodies.find((b) => b.id === id)?.longitude ?? (id === 'asc' ? chart.angles?.asc.longitude : id === 'mc' ? chart.angles?.mc.longitude : undefined) ?? null;
  // Corps sélectionné : seuls ses aspects restent visibles.
  const aspects = chart.aspects.filter((a) => selected === null || a.a === selected || a.b === selected);
  const dim = theme.opacities.dimmed;

  return (
    <View style={{ width: size, height: size }} accessible accessibilityRole="image" accessibilityLabel={accessibilityLabel}>
      <Canvas style={{ width: size, height: size }}>
        <Circle cx={c} cy={c} r={c * WHEEL_RADII.outer - 1} style="stroke" strokeWidth={theme.borderWidth} color={theme.colors.border} />
        <Circle cx={c} cy={c} r={c * WHEEL_RADII.signBandInner} style="stroke" strokeWidth={theme.borderWidth} color={theme.colors.border} />
        <Circle cx={c} cy={c} r={c * WHEEL_RADII.aspects} style="stroke" strokeWidth={theme.borderWidth} color={theme.colors.border} />
        {SIGN_IDS.map((sign, i) => {
          const start = at(i * 30, WHEEL_RADII.outer);
          const end = at(i * 30, WHEEL_RADII.signBandInner);
          const mid = at(i * 30 + 15, WHEEL_RADII.signGlyphs);
          return (
            <Group key={sign}>
              <Line p1={vec(start.x, start.y)} p2={vec(end.x, end.y)} strokeWidth={theme.borderWidth} color={theme.colors.border} />
              <Glyph id={`glyph-sign-${sign}`} x={mid.x} y={mid.y} size={SIGN_GLYPH_SIZE} color={theme.colors.textSecondary} />
            </Group>
          );
        })}
        {chart.houses?.map((house) => {
          const angular = house.house === 1 || house.house === 4 || house.house === 7 || house.house === 10;
          const outer = at(house.cusp, WHEEL_RADII.signBandInner);
          const inner = at(house.cusp, WHEEL_RADII.aspects);
          return <Line key={house.house} p1={vec(outer.x, outer.y)} p2={vec(inner.x, inner.y)} strokeWidth={angular ? 2 : theme.borderWidth} color={angular ? theme.colors.accent : theme.colors.border} />;
        })}
        {aspects.map((aspect) => {
          const [la, lb] = [longitudeOf(aspect.a), longitudeOf(aspect.b)];
          if (la === null || lb === null || aspect.type === 'conjunction') return null;
          const [p1, p2] = [at(la, WHEEL_RADII.aspects), at(lb, WHEEL_RADII.aspects)];
          // L'information ne repose pas sur la seule couleur : trait plein (harmonieux) ou pointillé (tendu).
          const hard = aspect.type === 'square' || aspect.type === 'opposition';
          return (
            <Line key={`${aspect.a}-${aspect.b}`} p1={vec(p1.x, p1.y)} p2={vec(p2.x, p2.y)} strokeWidth={theme.borderWidth}
              color={hard ? theme.colors.aspectHard : theme.colors.aspectSoft} opacity={aspectOpacity(aspect.orb, MAX_ASPECT_ORB)}>
              {hard ? <DashPathEffect intervals={[4, 4]} /> : null}
            </Line>
          );
        })}
        {placed.map((body) => {
          const tickOuter = at(body.longitude, WHEEL_RADII.signBandInner);
          const tickInner = at(body.longitude, WHEEL_RADII.ticksInner);
          const glyph = at(body.displayLongitude, WHEEL_RADII.bodyGlyphs);
          const active = selected === null || selected === body.id;
          return (
            <Group key={body.id} opacity={active ? 1 : dim}>
              <Line p1={vec(tickOuter.x, tickOuter.y)} p2={vec(tickInner.x, tickInner.y)} strokeWidth={theme.borderWidth} color={theme.colors.accent} />
              {body.displaced ? <Line p1={vec(tickInner.x, tickInner.y)} p2={vec(glyph.x, glyph.y)} strokeWidth={theme.borderWidth / 2} color={theme.colors.textSecondary} /> : null}
              <Glyph id={glyphIdOfBody(body.id)} x={glyph.x} y={glyph.y} size={BODY_GLYPH_SIZE * (selected === body.id ? 1.15 : 1)} color={selected === body.id ? theme.colors.accent : theme.colors.text} />
            </Group>
          );
        })}
      </Canvas>
      {/* Zones tactiles : une par corps, de 44 points, posées sur les glyphes. Toucher ailleurs désélectionne. */}
      <Pressable style={{ position: 'absolute', width: size, height: size }} onPress={() => onSelect(null)} accessible={false} />
      {placed.map((body) => {
        const glyph = at(body.displayLongitude, WHEEL_RADII.bodyGlyphs);
        const target = theme.minTouchTarget;
        return (
          <Pressable key={body.id} accessible={false} onPress={() => onSelect(selected === body.id ? null : body.id)}
            style={{ position: 'absolute', left: glyph.x - target / 2, top: glyph.y - target / 2, width: target, height: target }} />
        );
      })}
    </View>
  );
}
