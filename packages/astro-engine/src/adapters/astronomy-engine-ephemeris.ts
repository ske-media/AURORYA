// Adaptateur d'EphemerisPort sur la bibliothèque astronomy-engine (licence MIT, ADR-001).
import type { PlanetId } from '@aurorya/shared';
import {
  AstroTime, Body, GeoMoonState, GeoVector, RotateState, RotateVector, Rotation_EQJ_ECT,
  SiderealTime, SphereFromVector, type StateVector, e_tilt,
} from 'astronomy-engine';
import { computeHouses } from '../houses';
import { atan2D, norm360, signedDelta } from '../math/angles';
import type { EphemerisPort, RawPosition, UtcInstant } from '../ports/ephemeris-port';

const J2000_JD = 2451545.0;
const UNIX_EPOCH_JD = 2440587.5;
const MS_PER_DAY = 86_400_000;
/** Demi-pas de la différence centrée servant à la vitesse, en jours. */
const SPEED_STEP_DAYS = 0.01;
const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?Z$/;

const BODIES: Readonly<Record<PlanetId, Body>> = {
  sun: Body.Sun, moon: Body.Moon, mercury: Body.Mercury, venus: Body.Venus, mars: Body.Mars,
  jupiter: Body.Jupiter, saturn: Body.Saturn, uranus: Body.Uranus, neptune: Body.Neptune, pluto: Body.Pluto,
};

const timeAt = (jdUt: number): AstroTime => new AstroTime(jdUt - J2000_JD);

/** Position apparente (temps de lumière et aberration) dans l'écliptique vraie de la date. */
const planetLonLat = (body: PlanetId, jdUt: number): { longitude: number; latitude: number } => {
  const time = timeAt(jdUt);
  const sphere = SphereFromVector(RotateVector(Rotation_EQJ_ECT(time), GeoVector(BODIES[body], time, true)));
  return { longitude: norm360(sphere.lon), latitude: sphere.lat };
};

/**
 * Longitude du nœud ascendant d'une orbite, dans le repère écliptique où l'état est exprimé.
 * La normale au plan orbital est le moment cinétique r × v ; le nœud ascendant est dans la direction z × (r × v).
 */
export const ascendingNodeLongitude = (s: StateVector): number => {
  const hx = s.y * s.vz - s.z * s.vy;
  const hy = s.z * s.vx - s.x * s.vz;
  return norm360(atan2D(hx, -hy));
};

/** Nœud nord vrai : nœud ascendant de l'orbite osculatrice de la Lune sur l'écliptique vraie de la date. */
const trueNodeLongitude = (jdUt: number): number => {
  const time = timeAt(jdUt);
  return ascendingNodeLongitude(RotateState(Rotation_EQJ_ECT(time), GeoMoonState(time)));
};

export function createAstronomyEngineEphemeris(libraryVersion: string): EphemerisPort {
  const lonLat = (body: PlanetId | 'north_node', jdUt: number): { longitude: number; latitude: number } =>
    body === 'north_node' ? { longitude: trueNodeLongitude(jdUt), latitude: 0 } : planetLonLat(body, jdUt);

  return {
    julianDayUt(utc: UtcInstant): number {
      if (!ISO_UTC.test(utc)) throw new Error(`Instant UTC invalide : ${utc}`);
      const ms = Date.parse(utc);
      if (Number.isNaN(ms)) throw new Error(`Instant UTC invalide : ${utc}`);
      return ms / MS_PER_DAY + UNIX_EPOCH_JD;
    },

    position(jdUt, body): RawPosition {
      const at = lonLat(body, jdUt);
      const before = lonLat(body, jdUt - SPEED_STEP_DAYS).longitude;
      const after = lonLat(body, jdUt + SPEED_STEP_DAYS).longitude;
      return { ...at, speed: signedDelta(before, after) / (2 * SPEED_STEP_DAYS) };
    },

    houses(jdUt, latitude, longitude, system) {
      const time = timeAt(jdUt);
      const ramc = norm360(SiderealTime(time) * 15 + longitude);
      return computeHouses(ramc, e_tilt(time).tobl, latitude, system);
    },

    info: () => ({ library: 'astronomy-engine', libraryVersion, ephemeris: 'astronomy-engine' }),
  };
}
