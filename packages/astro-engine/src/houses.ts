// Maisons astrologiques : calcul géométrique pur à partir du temps sidéral local, de l'obliquité
// et de la latitude (ADR-001 : écrit en interne). Angles en degrés.
import { type Result, err, ok } from '@aurorya/shared';
import { asinD, atan2D, cosD, norm360, sinD, tanD } from './math/angles';
import type { HouseSystem, HouseSystemError, RawHouses } from './ports/ephemeris-port';

/** Longitude du point de l'écliptique dont l'ascension droite vaut `ra`. */
const eclipticLongitudeAtRa = (ra: number, obliquity: number): number =>
  norm360(atan2D(sinD(ra), cosD(ra) * cosD(obliquity)));

export const midheaven = (ramc: number, obliquity: number): number => eclipticLongitudeAtRa(ramc, obliquity);

/** Point de l'écliptique qui se lève à l'est. */
export const ascendant = (ramc: number, obliquity: number, latitude: number): number => {
  const asc = norm360(atan2D(cosD(ramc), -(sinD(ramc) * cosD(obliquity) + tanD(latitude) * sinD(obliquity))));
  // L'Ascendant suit le Milieu du Ciel de moins de 180° dans l'ordre du zodiaque.
  return norm360(asc - midheaven(ramc, obliquity)) < 180 ? asc : norm360(asc + 180);
};

/**
 * Cuspide de Placide : point de l'écliptique dont la distance au méridien vaut la fraction `fraction`
 * de son demi-arc (diurne au-dessus de l'horizon, nocturne en dessous). Renvoie null si le point
 * est circumpolaire à cette latitude (demi-arc indéfini).
 */
const placidusCusp = (ramc: number, obliquity: number, latitude: number, fraction: number, above: boolean): number | null => {
  let ra = above ? ramc + fraction * 90 : ramc + 180 - fraction * 90;
  for (let i = 0; i < 100; i += 1) {
    const declination = Math.atan(sinD(ra) * tanD(obliquity)) / (Math.PI / 180);
    const x = tanD(latitude) * tanD(declination);
    if (Math.abs(x) >= 1) return null;
    const ascensionalDifference = asinD(x);
    const next = above
      ? ramc + fraction * (90 + ascensionalDifference)
      : ramc + 180 - fraction * (90 - ascensionalDifference);
    if (Math.abs(next - ra) < 1e-11) return eclipticLongitudeAtRa(next, obliquity);
    ra = next;
  }
  return null;
};

const withOpposites = (asc: number, mc: number, c11: number, c12: number, c2: number, c3: number): RawHouses => {
  const opposite = (x: number): number => norm360(x + 180);
  return {
    asc,
    mc,
    cusps: [asc, c2, c3, opposite(mc), opposite(c11), opposite(c12), opposite(asc), opposite(c2), opposite(c3), mc, c11, c12],
  };
};

/**
 * @param ramc Ascension droite du Milieu du Ciel (temps sidéral local apparent), en degrés.
 * @param obliquity Obliquité vraie de l'écliptique, en degrés.
 * @param latitude Latitude géographique, nord positif, en degrés.
 */
export function computeHouses(
  ramc: number,
  obliquity: number,
  latitude: number,
  system: HouseSystem,
): Result<RawHouses, HouseSystemError> {
  const mc = midheaven(ramc, obliquity);
  const asc = ascendant(ramc, obliquity, latitude);
  if (!Number.isFinite(asc) || Math.abs(latitude) >= 90) return err({ code: 'HOUSE_SYSTEM_UNDEFINED', system, latitude });

  if (system === 'porphyry') {
    const upper = norm360(asc - mc); // arc du Milieu du Ciel à l'Ascendant
    const lower = 180 - upper; // arc de l'Ascendant au Fond du Ciel
    return ok(withOpposites(asc, mc, norm360(mc + upper / 3), norm360(mc + (2 * upper) / 3), norm360(asc + lower / 3), norm360(asc + (2 * lower) / 3)));
  }

  const c11 = placidusCusp(ramc, obliquity, latitude, 1 / 3, true);
  const c12 = placidusCusp(ramc, obliquity, latitude, 2 / 3, true);
  const c2 = placidusCusp(ramc, obliquity, latitude, 2 / 3, false);
  const c3 = placidusCusp(ramc, obliquity, latitude, 1 / 3, false);
  if (c11 === null || c12 === null || c2 === null || c3 === null) return err({ code: 'HOUSE_SYSTEM_UNDEFINED', system, latitude });
  return ok(withOpposites(asc, mc, c11, c12, c2, c3));
}
