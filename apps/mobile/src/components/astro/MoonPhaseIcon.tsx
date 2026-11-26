// Phase de la Lune, dessinée d'après la phase réelle renvoyée par le serveur. La partie éclairée est à droite
// quand la Lune croît, à gauche quand elle décroît (vue de l'hémisphère nord).
import { MOON_PHASES, type MoonPhase, logoColors } from '@aurorya/shared';
import { Canvas, Circle, Path, Skia } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { useTheme } from '@/theme/ThemeProvider';

/** Fraction éclairée du disque pour chacune des huit phases, dans l'ordre du cycle. */
const LIT_FRACTION: Readonly<Record<MoonPhase, number>> = {
  new_moon: 0, waxing_crescent: 0.25, first_quarter: 0.5, waxing_gibbous: 0.75,
  full_moon: 1, waning_gibbous: 0.75, last_quarter: 0.5, waning_crescent: 0.25,
};

export function MoonPhaseIcon({ phase, size }: { phase: MoonPhase; size: number }) {
  const theme = useTheme();
  const r = size / 2 - theme.borderWidth;
  const c = size / 2;
  const lit = useMemo(() => {
    const fraction = LIT_FRACTION[phase];
    if (fraction === 0 || fraction === 1) return null;
    const waxing = MOON_PHASES.indexOf(phase) < MOON_PHASES.indexOf('full_moon');
    // Demi-disque éclairé, puis terminateur elliptique : rentrant pour un croissant, sortant pour une gibbeuse.
    const rx = Math.abs(1 - 2 * fraction) * r;
    const side = waxing ? 1 : -1;
    const builder = Skia.PathBuilder.Make().moveTo(c, c - r).arcToRotated(r, r, 0, false, side < 0, c, c + r);
    return builder.arcToRotated(rx, r, 0, false, fraction > 0.5 ? side < 0 : side > 0, c, c - r).close().build();
  }, [phase, r, c]);
  return (
    <Canvas accessible={false} style={{ width: size, height: size }}>
      <Circle cx={c} cy={c} r={r} color={phase === 'full_moon' ? logoColors.sunTo : theme.colors.surfaceRaised} />
      {lit ? <Path path={lit} color={logoColors.sunTo} /> : null}
      <Circle cx={c} cy={c} r={r} style="stroke" strokeWidth={theme.borderWidth} color={theme.colors.accentMuted} />
    </Canvas>
  );
}
