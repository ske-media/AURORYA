import { describe, expect, it } from 'vitest';
import { WHEEL_RADII, aspectOpacity, minGlyphGap, norm360, pointAt, spreadGlyphs, wheelSize } from './wheel-geometry';

const at = <T>(list: readonly T[], index: number): T => {
  const value = list[index];
  if (value === undefined) throw new Error('index hors limites');
  return value;
};
const gapBetween = (a: number, b: number): number => {
  const d = norm360(b - a);
  return Math.min(d, 360 - d);
};

describe('repère de la roue', () => {
  it('borne le côté de la vue', () => {
    expect(wheelSize(390, 20)).toBe(350);
    expect(wheelSize(430, 20)).toBe(360);
  });
  it('place la référence (Ascendant) à gauche, au milieu', () => {
    const p = pointAt(123.4, 123.4, 300, 1);
    expect(p.x).toBeCloseTo(0, 9);
    expect(p.y).toBeCloseTo(150, 9);
  });
  it('fait tourner le zodiaque dans le sens inverse des aiguilles d’une montre', () => {
    // 90° après l'Ascendant : en bas de l'écran (sous l'horizon) ; 270° après : en haut.
    expect(pointAt(90, 0, 300, 1).y).toBeCloseTo(300, 9);
    expect(pointAt(270, 0, 300, 1).y).toBeCloseTo(0, 9);
    expect(pointAt(180, 0, 300, 1).x).toBeCloseTo(300, 9);
  });
  it('place le Milieu du Ciel dans la moitié haute', () => {
    // Le Milieu du Ciel précède l'Ascendant de 60° à 120° environ dans l'ordre du zodiaque.
    for (const [asc, mc] of [[12.3, 278.9], [130, 40], [300, 215], [45, 310]] as const) {
      expect(pointAt(mc, asc, 300, WHEEL_RADII.signBandInner).y).toBeLessThan(150);
    }
  });
  it('respecte les rayons', () => {
    const p = pointAt(0, 0, 200, WHEEL_RADII.bodyGlyphs);
    expect(100 - p.x).toBeCloseTo(66, 9);
  });
});

describe('anti-collision des glyphes', () => {
  const gap = minGlyphGap(350);
  it('calcule l’écart minimal δ = 2·asin(t / (2 × 0,66 R)) + 2°', () => {
    expect(gap).toBeCloseTo((2 * Math.asin(22 / (2 * 0.66 * 175))) * (180 / Math.PI) + 2, 9);
    expect(gap).toBeGreaterThan(12);
    expect(gap).toBeLessThan(14);
  });
  it('ne déplace pas les corps isolés', () => {
    const placed = spreadGlyphs([{ id: 'sun', longitude: 10 }, { id: 'moon', longitude: 100 }, { id: 'mars', longitude: 250 }], gap);
    expect(placed.every((b) => !b.displaced && b.displayLongitude === b.longitude)).toBe(true);
  });
  it('écarte un groupe serré autour de son barycentre, en gardant l’ordre', () => {
    const placed = spreadGlyphs([{ id: 'sun', longitude: 27.5 }, { id: 'mercury', longitude: 21 }, { id: 'venus', longitude: 24.3 }], gap);
    expect(placed.map((b) => b.id)).toEqual(['mercury', 'venus', 'sun']);
    expect(placed.every((b) => b.displaced)).toBe(true);
    const shown = placed.map((b) => b.displayLongitude);
    expect((at(shown, 0) + at(shown, 1) + at(shown, 2)) / 3).toBeCloseTo((21 + 24.3 + 27.5) / 3, 9);
    expect(at(shown, 1) - at(shown, 0)).toBeCloseTo(gap, 9);
    expect(at(shown, 2) - at(shown, 1)).toBeCloseTo(gap, 9);
  });
  it('garantit l’écart minimal sur des thèmes chargés, y compris autour de 0°', () => {
    const charts = [
      [3, 5, 8, 356, 359, 120, 121, 240, 300, 301, 302],
      [10, 11, 12, 13, 14, 15, 16, 200, 201, 202, 203],
      [224.5, 226, 230, 12, 45, 47.1, 49.9, 180, 181, 300, 359.9],
    ];
    for (const longitudes of charts) {
      const bodies = longitudes.map((longitude, i) => ({ id: `b${String(i).padStart(2, '0')}`, longitude }));
      const placed = spreadGlyphs(bodies, gap);
      expect(placed).toHaveLength(bodies.length);
      placed.forEach((b, i) => {
        const next = at(placed, (i + 1) % placed.length);
        expect(gapBetween(b.displayLongitude, next.displayLongitude)).toBeGreaterThanOrEqual(gap - 1e-6);
      });
      // L'ordre autour du cercle suit celui des positions réelles.
      const byReal = [...placed].sort((a, b) => a.longitude - b.longitude).map((b) => b.id);
      const start = placed.findIndex((b) => b.id === byReal[0]);
      expect([...placed.slice(start), ...placed.slice(0, start)].map((b) => b.id)).toEqual(byReal);
      expect(spreadGlyphs(bodies, gap)).toEqual(placed);
      expect(spreadGlyphs([...bodies].reverse(), gap)).toEqual(placed);
    }
  });
  it('répartit régulièrement quand le cercle est saturé', () => {
    const bodies = Array.from({ length: 40 }, (_, i) => ({ id: `b${String(i).padStart(2, '0')}`, longitude: i }));
    const placed = spreadGlyphs(bodies, gap);
    expect(gapBetween(at(placed, 0).displayLongitude, at(placed, 1).displayLongitude)).toBeCloseTo(9, 9);
  });
  it('accepte une liste vide ou un seul corps', () => {
    expect(spreadGlyphs([], gap)).toEqual([]);
    expect(spreadGlyphs([{ id: 'sun', longitude: 400 }], gap)).toEqual([{ id: 'sun', longitude: 40, displayLongitude: 40, displaced: false }]);
  });
});

describe('aspects', () => {
  it('fait décroître l’opacité avec l’orbe, de 0,9 à 0,25', () => {
    expect(aspectOpacity(0, 8)).toBe(0.9);
    expect(aspectOpacity(8, 8)).toBe(0.25);
    expect(aspectOpacity(4, 8)).toBe(0.575);
    expect(aspectOpacity(20, 8)).toBe(0.25);
  });
});
