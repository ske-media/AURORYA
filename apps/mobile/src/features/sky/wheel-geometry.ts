// Géométrie de la roue astrale (SPEC §16.6). Fonctions pures et déterministes : aucun calcul
// astrologique ici, seulement le placement à l'écran de positions déjà calculées par le serveur.

/** Rayons, en fraction du rayon R de la roue. */
export const WHEEL_RADII = {
  outer: 1.0,
  signGlyphs: 0.92,
  signBandInner: 0.84,
  ticksInner: 0.8,
  houseNumbers: 0.77,
  bodyGlyphs: 0.66,
  aspects: 0.5,
} as const;

/** Taille d'un glyphe de corps, en points. */
export const BODY_GLYPH_SIZE = 22;
export const MAX_WHEEL_SIZE = 360;
const MAX_PASSES = 20;
const DEG = Math.PI / 180;

export const norm360 = (degrees: number): number => ((degrees % 360) + 360) % 360;

/** Côté de la vue carrée : S = min(largeur − 40, 360). */
export const wheelSize = (screenWidth: number, screenMargin: number): number =>
  Math.max(0, Math.min(screenWidth - 2 * screenMargin, MAX_WHEEL_SIZE));

export type Point = Readonly<{ x: number; y: number }>;

/**
 * Position d'une longitude écliptique sur la roue. La référence (Ascendant, ou 0° sans heure exacte)
 * est à gauche et le zodiaque tourne dans le sens inverse des aiguilles d'une montre :
 * θ = 180° + (λ − λ₀), x = cx + r·cos θ, y = cy − r·sin θ.
 */
export function pointAt(longitude: number, reference: number, size: number, radiusFactor: number): Point {
  const r = (size / 2) * radiusFactor;
  const theta = (180 + (longitude - reference)) * DEG;
  return { x: size / 2 + r * Math.cos(theta), y: size / 2 - r * Math.sin(theta) };
}

/** Écart angulaire minimal entre deux glyphes : δ = 2·asin(t / (2 × 0,66 R)) + 2°. */
export const minGlyphGap = (size: number, glyphSize: number = BODY_GLYPH_SIZE): number => {
  const ratio = glyphSize / (2 * WHEEL_RADII.bodyGlyphs * (size / 2));
  return (2 * Math.asin(Math.min(1, ratio))) / DEG + 2;
};

export type PlacedBody<Id extends string> = Readonly<{
  id: Id;
  /** Position réelle, où se trouve la graduation. */
  longitude: number;
  /** Position du glyphe après écartement. */
  displayLongitude: number;
  /** Vrai si le glyphe a été déplacé : un trait fin le relie alors à sa graduation. */
  displaced: boolean;
}>;

/**
 * Anti-collision des glyphes : tri par longitude, regroupement des corps plus proches que `gap`,
 * répartition symétrique de chaque groupe autour de son barycentre avec un pas de `gap`, répété
 * jusqu'à stabilité (20 passes au plus). L'ordre des corps autour du cercle est conservé.
 */
export function spreadGlyphs<Id extends string>(bodies: readonly Readonly<{ id: Id; longitude: number }>[], gap: number): PlacedBody<Id>[] {
  if (bodies.length === 0) return [];
  const sorted = [...bodies].sort((a, b) => norm360(a.longitude) - norm360(b.longitude) || (a.id < b.id ? -1 : 1));
  if (sorted.length * gap > 360) {
    // Trop de corps pour le cercle : répartition régulière, dans l'ordre.
    const step = 360 / sorted.length;
    const start = norm360(sorted[0]?.longitude ?? 0);
    return sorted.map((b, i) => ({ id: b.id, longitude: norm360(b.longitude), displayLongitude: norm360(start + i * step), displaced: true }));
  }
  // Coupe le cercle au plus grand intervalle libre, pour travailler sur une ligne sans raccord.
  let cut = 0;
  let widest = -1;
  sorted.forEach((b, i) => {
    const next = sorted[(i + 1) % sorted.length] ?? b;
    const free = norm360(next.longitude - b.longitude) || (sorted.length === 1 ? 360 : 0);
    if (free > widest) {
      widest = free;
      cut = (i + 1) % sorted.length;
    }
  });
  const ordered = [...sorted.slice(cut), ...sorted.slice(0, cut)];
  const origin = norm360(ordered[0]?.longitude ?? 0);
  const real = ordered.map((b) => norm360(b.longitude - origin));
  let display = [...real];

  for (let pass = 0; pass < MAX_PASSES; pass += 1) {
    // Groupes de voisins trop proches, d'après les positions affichées courantes.
    const groups: number[][] = [];
    display.forEach((position, i) => {
      const last = groups[groups.length - 1];
      const previous = last ? display[last[last.length - 1] ?? 0] ?? 0 : 0;
      if (last && position - previous < gap - 1e-9) last.push(i);
      else groups.push([i]);
    });
    const next = [...display];
    for (const group of groups) {
      if (group.length === 1) continue;
      const center = group.reduce((sum, i) => sum + (real[i] ?? 0), 0) / group.length;
      group.forEach((i, k) => {
        next[i] = center + (k - (group.length - 1) / 2) * gap;
      });
    }
    const stable = next.every((value, i) => Math.abs(value - (display[i] ?? 0)) < 1e-9);
    display = next;
    if (stable) break;
  }
  return ordered.map((b, i) => {
    const shown = display[i] ?? 0;
    return {
      id: b.id,
      longitude: norm360(b.longitude),
      displayLongitude: norm360(origin + shown),
      displaced: Math.abs(shown - (real[i] ?? 0)) > 1e-9,
    };
  });
}

/** Opacité d'une ligne d'aspect : décroît avec l'orbe, de 0,9 (exact) à 0,25 (orbe maximale). */
export const aspectOpacity = (orb: number, maxOrb: number): number => {
  const t = maxOrb <= 0 ? 0 : Math.min(1, Math.max(0, orb / maxOrb));
  return Math.round((0.9 - t * 0.65) * 1000) / 1000;
};
