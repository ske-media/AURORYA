// Tests de référence du moteur (SPEC §11.8, ADR-001, ADR-012) : comparaison aux éphémérides DE441
// de la NASA (JPL Horizons). Les valeurs attendues viennent du fichier téléchargé, jamais de mémoire.
import { PLANET_IDS } from '@aurorya/shared';
import { AstroTime, GeoMoonState, RotateState, Rotation_EQJ_ECL, SiderealTime } from 'astronomy-engine';
import { describe, expect, it } from 'vitest';
import golden from '../__fixtures__/golden/horizons.v1.json';
import { ascendingNodeLongitude, createAstronomyEngineEphemeris } from './adapters/astronomy-engine-ephemeris';
import { signedDelta } from './math/angles';

/** Tolérance en degrés (ADR-012) : 0,01° = 36 secondes d'arc. */
const TOLERANCE = 0.01;
const J2000 = 2451545;
const ephemeris = createAstronomyEngineEphemeris('test');

describe('positions apparentes géocentriques, 48 instants de 1900 à 2030', () => {
  it.each(PLANET_IDS)('%s : longitude et latitude à moins de 0,01°', (body) => {
    const rows = golden.positions[body].rows;
    expect(rows).toHaveLength(48);
    for (const row of rows) {
      const position = ephemeris.position(row.jdUt, body);
      expect(Math.abs(signedDelta(row.longitude, position.longitude))).toBeLessThan(TOLERANCE);
      expect(Math.abs(position.latitude - row.latitude)).toBeLessThan(TOLERANCE);
    }
  });
});

describe('nœud lunaire et temps sidéral', () => {
  it('la méthode du nœud ascendant reproduit les éléments osculateurs de la NASA (écliptique J2000)', () => {
    for (const row of golden.moonNode.rows) {
      const state = RotateState(Rotation_EQJ_ECL(), GeoMoonState(AstroTime.FromTerrestrialTime(row.jdTdb - J2000)));
      expect(Math.abs(signedDelta(row.ascendingNodeJ2000, ascendingNodeLongitude(state)))).toBeLessThan(TOLERANCE);
    }
  });

  it('le temps sidéral apparent de Greenwich concorde à moins de 0,005° (UT1 − UTC non modélisé)', () => {
    for (const row of golden.siderealTime.rows) {
      const gast = SiderealTime(new AstroTime(row.jdUt - J2000)) * 15;
      expect(Math.abs(signedDelta(row.gastHours * 15, gast))).toBeLessThan(0.005);
    }
  });
});

describe('port', () => {
  it('convertit un instant UTC en jour julien', () => {
    expect(ephemeris.julianDayUt('2000-01-01T12:00:00Z')).toBe(2451545);
    expect(ephemeris.julianDayUt('1900-01-01T00:00:00Z')).toBe(2415020.5);
    expect(() => ephemeris.julianDayUt('2000-01-01 12:00')).toThrow();
  });

  it('est déterministe et borne les longitudes', () => {
    for (const body of [...PLANET_IDS, 'north_node' as const]) {
      const a = ephemeris.position(2449095.02431, body);
      expect(ephemeris.position(2449095.02431, body)).toEqual(a);
      expect(a.longitude).toBeGreaterThanOrEqual(0);
      expect(a.longitude).toBeLessThan(360);
    }
  });

  it('donne au Soleil et à la Lune une vitesse toujours directe, et au nœud vrai un recul moyen', () => {
    let nodeSum = 0;
    for (const row of golden.positions.sun.rows) {
      expect(ephemeris.position(row.jdUt, 'sun').speed).toBeGreaterThan(0.9);
      expect(ephemeris.position(row.jdUt, 'moon').speed).toBeGreaterThan(11);
      nodeSum += ephemeris.position(row.jdUt, 'north_node').speed;
    }
    expect(nodeSum / 48).toBeLessThan(0);
  });
});
