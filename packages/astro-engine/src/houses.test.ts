import { AstroTime, EquatorFromVector, Horizon, Observer, RotateVector, Rotation_ECT_EQD, Spherical, VectorFromSphere } from 'astronomy-engine';
import { describe, expect, it } from 'vitest';
import { createAstronomyEngineEphemeris } from './adapters/astronomy-engine-ephemeris';
import { computeHouses } from './houses';
import { asinD, atan2D, cosD, norm360, sinD, tanD } from './math/angles';

const ephemeris = createAstronomyEngineEphemeris('test');
const SITES = [
  ['Paris', 48.85, 2.35], ['Montréal', 45.5, -73.57], ['Sydney', -33.87, 151.2],
  ['Reykjavik', 64.1, -21.9], ['équateur', 0, 0], ['Genève', 46.2, 6.14],
] as const;
const instants = Array.from({ length: 40 }, (_, i) => 2415020.5 + i * 1187.3391);

/** Position horizontale d'un point de l'écliptique, par un chemin de calcul indépendant de houses.ts. */
const horizontal = (jd: number, lat: number, lon: number, lambda: number) => {
  const time = new AstroTime(jd - 2451545);
  const eqd = EquatorFromVector(RotateVector(Rotation_ECT_EQD(time), VectorFromSphere(new Spherical(0, lambda, 1), time)));
  return Horizon(time, new Observer(lat, lon, 0), eqd.ra, eqd.dec);
};

describe('angles', () => {
  it.each(SITES)("%s : l'Ascendant est sur l'horizon est, le Milieu du Ciel au méridien", (_name, lat, lon) => {
    for (const jd of instants) {
      const houses = ephemeris.houses(jd, lat, lon, 'placidus');
      if (!houses.ok) throw new Error('Placidus devrait être défini ici');
      const asc = horizontal(jd, lat, lon, houses.value.asc);
      expect(Math.abs(asc.altitude)).toBeLessThan(1e-6);
      expect(asc.azimuth).toBeGreaterThan(0);
      expect(asc.azimuth).toBeLessThan(180);
      const mc = horizontal(jd, lat, lon, houses.value.mc);
      const offMeridian = Math.min(Math.abs(mc.azimuth - 180), mc.azimuth, 360 - mc.azimuth) * cosD(mc.altitude);
      expect(offMeridian).toBeLessThan(1e-6);
    }
  });
});

describe('Placidus', () => {
  const ramcs = [0, 17.3, 95, 143.7, 181, 222.2, 270, 311.9];
  const lats = [-55, -33.9, 0, 23, 45.5, 48.85, 60];
  const obliquity = 23.44;

  it('produit douze cuspides croissantes, opposées deux à deux', () => {
    for (const ramc of ramcs) for (const lat of lats) {
      const h = computeHouses(ramc, obliquity, lat, 'placidus');
      if (!h.ok) throw new Error(`indéfini à ${lat}`);
      const c = h.value.cusps;
      expect(c).toHaveLength(12);
      expect(c[0]).toBe(h.value.asc);
      expect(c[9]).toBe(h.value.mc);
      for (let k = 0; k < 12; k += 1) {
        const step = norm360((c[(k + 1) % 12] ?? 0) - (c[k] ?? 0));
        expect(step).toBeGreaterThan(0);
        expect(step).toBeLessThan(180);
        if (k < 6) expect(norm360((c[k + 6] ?? 0) - (c[k] ?? 0))).toBeCloseTo(180, 9);
      }
    }
  });

  it('respecte sa définition : distance au méridien = fraction du demi-arc', () => {
    // Recalcul direct depuis la longitude de la cuspide, sans passer par l'itération.
    const check = (lambda: number, ramc: number, lat: number, fraction: number, above: boolean): void => {
      const ra = atan2D(sinD(lambda) * cosD(obliquity), cosD(lambda));
      const declination = asinD(sinD(obliquity) * sinD(lambda));
      const ad = asinD(tanD(lat) * tanD(declination));
      const expected = above ? fraction * (90 + ad) : 180 - fraction * (90 - ad);
      expect(norm360(ra - ramc)).toBeCloseTo(norm360(expected), 7);
    };
    for (const ramc of ramcs) for (const lat of lats) {
      const h = computeHouses(ramc, obliquity, lat, 'placidus');
      if (!h.ok) throw new Error(`indéfini à ${lat}`);
      const c = h.value.cusps;
      check(c[10] ?? 0, ramc, lat, 1 / 3, true);
      check(c[11] ?? 0, ramc, lat, 2 / 3, true);
      check(c[1] ?? 0, ramc, lat, 2 / 3, false);
      check(c[2] ?? 0, ramc, lat, 1 / 3, false);
    }
  });

  it('se réduit à des maisons de 30° d’ascension droite à l’équateur', () => {
    const h = computeHouses(40, obliquity, 0, 'placidus');
    if (!h.ok) throw new Error('indéfini');
    const ra = (lambda: number): number => norm360(atan2D(sinD(lambda) * cosD(obliquity), cosD(lambda)));
    expect(ra(h.value.cusps[10] ?? 0)).toBeCloseTo(70, 7);
    expect(ra(h.value.cusps[11] ?? 0)).toBeCloseTo(100, 7);
    expect(ra(h.value.asc)).toBeCloseTo(130, 7);
  });

  it('échoue au-delà du cercle polaire avec une erreur typée, et Porphyre prend le relais', () => {
    const polar = computeHouses(100, obliquity, 78.2, 'placidus');
    expect(polar).toEqual({ ok: false, error: { code: 'HOUSE_SYSTEM_UNDEFINED', system: 'placidus', latitude: 78.2 } });
    const fallback = computeHouses(100, obliquity, 78.2, 'porphyry');
    if (!fallback.ok) throw new Error('Porphyre devrait être défini');
    const c = fallback.value.cusps;
    expect(norm360((c[10] ?? 0) - (c[9] ?? 0))).toBeCloseTo(norm360((c[11] ?? 0) - (c[10] ?? 0)), 9);
    expect(norm360((c[1] ?? 0) - (c[0] ?? 0))).toBeCloseTo(norm360((c[2] ?? 0) - (c[1] ?? 0)), 9);
  });
});
