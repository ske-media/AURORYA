// Détection des aspects entre deux ensembles de points (SPEC §11.5 étape 6, §11.7).
import { ASPECT_ANGLES, ASPECT_IDS, type AspectId } from '@aurorya/shared';
import { signedDelta } from './math/angles';

export type AspectPoint = Readonly<{ id: string; longitude: number; /** null pour un angle ou un point fixe. */ speed: number | null }>;
export type AspectHit = Readonly<{ type: AspectId; orb: number; applying: boolean | null }>;

/**
 * Aspect formé par deux points, ou null. `allowedOrb` donne l'orbe admise pour chaque type.
 * Si plusieurs types sont admissibles, le plus exact l'emporte.
 */
export function findAspect(a: AspectPoint, b: AspectPoint, allowedOrb: (type: AspectId) => number): AspectHit | null {
  const signed = signedDelta(a.longitude, b.longitude);
  const separation = Math.abs(signed);
  let best: { type: AspectId; deviation: number } | null = null;
  for (const type of ASPECT_IDS) {
    const deviation = Math.abs(separation - ASPECT_ANGLES[type]);
    if (deviation <= allowedOrb(type) && (best === null || deviation < best.deviation)) best = { type, deviation };
  }
  if (best === null) return null;

  let applying: boolean | null = null;
  if (a.speed !== null && b.speed !== null) {
    // Variation de la séparation, puis de l'écart à l'exactitude.
    const separationRate = (signed >= 0 ? 1 : -1) * (b.speed - a.speed);
    const deviationRate = (separation >= ASPECT_ANGLES[best.type] ? 1 : -1) * separationRate;
    applying = deviationRate < 0;
  }
  return { type: best.type, orb: Math.round(best.deviation * 1e4) / 1e4, applying };
}
