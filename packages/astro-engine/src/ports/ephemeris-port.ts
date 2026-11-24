// Frontière entre le moteur et la bibliothèque d'astronomie (SPEC §11.3, ADR-001).
// Rien d'autre dans le projet ne fait de calcul astronomique.
import type { PlanetId, Result } from '@aurorya/shared';

/** Instant UTC au format ISO 8601, par exemple « 1993-04-17T12:35:00Z ». */
export type UtcInstant = string;

export type HouseSystem = 'placidus' | 'porphyry';

export type RawPosition = Readonly<{
  /** Longitude écliptique géocentrique apparente, zodiaque tropical, en degrés dans [0, 360[. */
  longitude: number;
  /** Latitude écliptique en degrés. */
  latitude: number;
  /** Vitesse en longitude, en degrés par jour. Négative si le corps rétrograde. */
  speed: number;
}>;

export type RawHouses = Readonly<{
  /** Cuspides des maisons 1 à 12, en degrés de longitude écliptique. */
  cusps: readonly number[];
  asc: number;
  mc: number;
}>;

export type HouseSystemError = Readonly<{ code: 'HOUSE_SYSTEM_UNDEFINED'; system: HouseSystem; latitude: number }>;

export interface EphemerisPort {
  /** Jour julien (temps universel) pour un instant UTC. */
  julianDayUt(utc: UtcInstant): number;
  /** Position géocentrique apparente d'une planète ou du nœud nord vrai. */
  position(jdUt: number, body: PlanetId | 'north_node'): RawPosition;
  /** Cuspides, Ascendant et Milieu du Ciel. Erreur typée si le système échoue à cette latitude. */
  houses(jdUt: number, latitude: number, longitude: number, system: HouseSystem): Result<RawHouses, HouseSystemError>;
  info(): { library: string; libraryVersion: string; ephemeris: string };
}
