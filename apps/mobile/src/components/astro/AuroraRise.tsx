// Animation de l'aurore (SPEC Annexe C.5, T-015) : le symbole se construit au rythme des étapes réelles du calcul.
// `stage` : 0 rien · 1 le cercle se trace depuis l'Ascendant · 2 l'horizon s'étend, l'Ascendant s'allume ·
// 3 le soleil se lève, les halos s'ouvrent · 4 les jambes du A montent, l'étoile paraît.
// Les phases s'enchaînent sans attente : si une étape arrive tôt, l'animation rattrape à vitesse constante.
import { LOGO, type ThemeName, logoColorsFor } from '@aurorya/shared';
import { BlurMask, Canvas, Circle, Group, LinearGradient, Path, Skia, vec } from '@shopify/react-native-skia';
import { useEffect, useMemo, useRef } from 'react';
import { Easing, runOnJS, useDerivedValue, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { useTheme } from '@/theme/ThemeProvider';

export type AuroraStage = 0 | 1 | 2 | 3 | 4;
const FINAL_STAGE = 4;
const RAD_TO_DEG = 180 / Math.PI;

const buildPaths = () => {
  const { circle, horizon, ascendant, sun, halos, letter } = LOGO;
  const oval = (cx: number, cy: number, r: number) => Skia.XYWHRect(cx - r, cy - r, r * 2, r * 2);
  const startAngle = Math.atan2(ascendant.cy - circle.cy, ascendant.cx - circle.cx) * RAD_TO_DEG;
  const leg = (from: { x: number; y: number }) => Skia.PathBuilder.Make().moveTo(from.x, from.y).lineTo(letter.apex.x, letter.apex.y).build();
  const halo = (r: number) => Skia.PathBuilder.Make().addArc(oval(sun.cx, horizon.y, r), 180, 180).build();
  return {
    ring: Skia.PathBuilder.Make().addArc(oval(circle.cx, circle.cy, circle.r), startAngle, 359.9).build(),
    line: Skia.PathBuilder.Make().moveTo(horizon.x1, horizon.y).lineTo(horizon.x2, horizon.y).build(),
    disc: Skia.PathBuilder.Make().addCircle(sun.cx, horizon.y, sun.r).build(),
    aboveHorizon: Skia.XYWHRect(0, 0, LOGO.box, horizon.y),
    insideLetter: Skia.PathBuilder.Make().moveTo(letter.apex.x, letter.apex.y).lineTo(letter.left.x, letter.left.y).lineTo(letter.right.x, letter.right.y).close().build(),
    haloOuter: halo(halos[0].r),
    haloInner: halo(halos[1].r),
    legLeft: leg(letter.left),
    legRight: leg(letter.right),
    star: Skia.Path.MakeFromSVGString(LOGO.star),
  };
};

export function AuroraRise({ stage, size, onFinished, on }: { stage: AuroraStage; size: number; onFinished?: () => void; /** Fond sur lequel le symbole est posé ; celui du thème par défaut. */ on?: ThemeName }) {
  const theme = useTheme();
  const logoColors = logoColorsFor[on ?? theme.name];
  const reducedMotion = useReducedMotion();
  const paths = useMemo(buildPaths, []);
  const progress = useSharedValue(0);
  const previous = useRef(0);
  const finished = useRef(onFinished);
  finished.current = onFinished;

  useEffect(() => {
    const notify = (): void => { if (stage === FINAL_STAGE) finished.current?.(); };
    const steps = Math.max(1, stage - previous.current);
    previous.current = stage;
    // Mouvement réduit : fondu doux entre états fixes, sans tracé progressif.
    const duration = reducedMotion ? theme.durations.base : theme.durations.slow * steps;
    progress.value = withTiming(stage, { duration, easing: Easing.linear }, (done) => {
      'worklet';
      if (done) runOnJS(notify)();
    });
  }, [stage, reducedMotion, progress, theme.durations.base, theme.durations.slow]);

  // Avancement de chaque phase, de 0 à 1. En mouvement réduit, une phase est soit absente, soit complète.
  const phase = (n: number) => () => {
    'worklet';
    const local = Math.min(1, Math.max(0, progress.value - (n - 1)));
    return local;
  };
  const p1 = useDerivedValue(phase(1));
  const p2 = useDerivedValue(phase(2));
  const p3 = useDerivedValue(phase(3));
  const p4 = useDerivedValue(phase(4));
  const ringEnd = useDerivedValue(() => (reducedMotion ? 1 : p1.value));
  const lineEnd = useDerivedValue(() => (reducedMotion ? 1 : p2.value));
  const legEnd = useDerivedValue(() => (reducedMotion ? 1 : p4.value));
  const sunRise = useDerivedValue(() => [{ translateY: reducedMotion ? 0 : LOGO.sun.r * (1 - Math.min(1, p3.value * 2)) }]);
  const haloOuter = useDerivedValue(() => Math.min(1, Math.max(0, p3.value * 3 - 1)) * LOGO.halos[0].opacity);
  const haloInner = useDerivedValue(() => Math.min(1, Math.max(0, p3.value * 3 - 2)) * LOGO.halos[1].opacity);
  const starOpacity = useDerivedValue(() => Math.min(1, Math.max(0, p4.value * 4 - 3)));
  const ringOpacity = useDerivedValue(() => (reducedMotion ? p1.value : 1) * LOGO.circle.opacity);

  const scale = size / LOGO.box;
  return (
    <Canvas accessible={false} style={{ width: size, height: size }}>
      <Group transform={[{ scale }]}>
        <Path path={paths.ring} end={ringEnd} opacity={ringOpacity} color={logoColors.ring} style="stroke" strokeWidth={LOGO.circle.strokeWidth} />
        <Group clip={paths.insideLetter}>
          <Path path={paths.haloOuter} opacity={haloOuter} color={logoColors.halo} style="stroke" strokeWidth={1} />
          <Path path={paths.haloInner} opacity={haloInner} color={logoColors.halo} style="stroke" strokeWidth={1} />
        </Group>
        <Group clip={paths.aboveHorizon} opacity={p3}>
          <Group transform={sunRise}>
            <Path path={paths.disc}>
              <LinearGradient start={vec(0, LOGO.horizon.y)} end={vec(0, LOGO.horizon.y - LOGO.sun.r)} colors={[logoColors.sunFrom, logoColors.sunTo]} />
            </Path>
          </Group>
        </Group>
        <Path path={paths.line} end={lineEnd} opacity={reducedMotion ? p2 : 1} color={logoColors.horizon} style="stroke" strokeWidth={LOGO.horizon.strokeWidth} strokeCap="round" />
        <Path path={paths.legLeft} end={legEnd} opacity={reducedMotion ? p4 : 1} color={logoColors.letter} style="stroke" strokeWidth={LOGO.letter.strokeWidth} strokeCap="round" />
        <Path path={paths.legRight} end={legEnd} opacity={reducedMotion ? p4 : 1} color={logoColors.letter} style="stroke" strokeWidth={LOGO.letter.strokeWidth} strokeCap="round" />
        <Circle cx={LOGO.ascendant.cx} cy={LOGO.ascendant.cy} r={LOGO.ascendant.r * 3} color={theme.colors.glow} opacity={p2}>
          <BlurMask blur={LOGO.ascendant.r * 2} style="normal" />
        </Circle>
        <Circle cx={LOGO.ascendant.cx} cy={LOGO.ascendant.cy} r={LOGO.ascendant.r} color={logoColors.letter} opacity={p2} />
        {paths.star ? <Path path={paths.star} color={logoColors.star} opacity={starOpacity} /> : null}
      </Group>
    </Canvas>
  );
}
