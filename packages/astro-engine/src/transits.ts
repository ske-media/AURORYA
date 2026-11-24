// Transits, synastrie et ciel du jour (SPEC §11.7).
import {
  type AspectId, type ChartPayload, MOON_PHASES, type MoonPhase, PLANET_IDS, type PlanetId, type SignId, signFromLongitude,
} from '@aurorya/shared';
import { findAspect } from './aspects';
import { houseOf } from './chart';
import type { EngineConfig } from './config';
import { norm360 } from './math/angles';
import type { EphemerisPort, UtcInstant } from './ports/ephemeris-port';

type NatalPointId = PlanetId | 'north_node' | 'asc' | 'mc';
const natalPoints = (chart: ChartPayload): { id: NatalPointId; longitude: number }[] => [
  ...chart.bodies.filter((b) => !b.signUncertain).map((b) => ({ id: b.id, longitude: b.longitude })),
  ...(chart.angles ? [{ id: 'asc' as const, longitude: chart.angles.asc.longitude }, { id: 'mc' as const, longitude: chart.angles.mc.longitude }] : []),
];
const cuspsOf = (chart: ChartPayload): number[] | null => chart.houses?.map((h) => h.cusp) ?? null;

export type TransitHit = Readonly<{
  transiting: PlanetId; natal: NatalPointId; type: AspectId; orb: number; applying: boolean | null;
  /** Maison natale traversée par le corps en transit, si l'heure de naissance est exacte. */
  house: number | null;
}>;
export type TransitResult = Readonly<{
  /** Classés : planètes lentes sur points personnels d'abord, puis orbe croissante. */
  hits: TransitHit[];
  /** La Lune ne sert qu'au climat du jour. */
  moon: Readonly<{ sign: SignId; house: number | null }>;
}>;

export function computeTransitsWith(ephemeris: EphemerisPort, chart: ChartPayload, at: UtcInstant, config: EngineConfig): TransitResult {
  const jd = ephemeris.julianDayUt(at);
  const cusps = cuspsOf(chart);
  const natal = natalPoints(chart);
  const hits: TransitHit[] = [];
  let moon: TransitResult['moon'] = { sign: 'aries', house: null };
  for (const transiting of PLANET_IDS) {
    const position = ephemeris.position(jd, transiting);
    const house = cusps ? houseOf(position.longitude, cusps) : null;
    if (transiting === 'moon') {
      moon = { sign: signFromLongitude(position.longitude), house };
      continue;
    }
    for (const point of natal) {
      // Le point natal est fixe : seule la vitesse du corps en transit décide si l'aspect se forme.
      const hit = findAspect({ id: point.id, longitude: point.longitude, speed: 0 }, { id: transiting, longitude: position.longitude, speed: position.speed }, (type) => config.transitOrbs[type]);
      if (hit) hits.push({ transiting, natal: point.id, ...hit, house });
    }
  }
  const { slowBodies, personalPoints } = config.transitRanking;
  const tier = (hit: TransitHit): number =>
    slowBodies.includes(hit.transiting) && (personalPoints as readonly string[]).includes(hit.natal) ? 0 : 1;
  hits.sort((a, b) => tier(a) - tier(b) || a.orb - b.orb || PLANET_IDS.indexOf(a.transiting) - PLANET_IDS.indexOf(b.transiting) || (a.natal < b.natal ? -1 : 1));
  return { hits, moon };
}

export type SynastryAspect = Readonly<{ a: NatalPointId; b: NatalPointId; type: AspectId; orb: number; harmony: number; tension: number }>;
export type SynastryResult = Readonly<{
  /** Aspects croisés, du plus lourd au plus léger. `a` appartient au premier thème, `b` au second. */
  aspects: SynastryAspect[];
  /** Scores entiers servant uniquement à choisir les duos : jamais affichés (SPEC §11.7). */
  harmony: number;
  tension: number;
}>;

export function computeSynastry(a: ChartPayload, b: ChartPayload, config: EngineConfig): SynastryResult {
  const weights = config.synastryWeights;
  const eligible = (chart: ChartPayload): { id: NatalPointId; longitude: number }[] => natalPoints(chart).filter((p) => p.id !== 'north_node' && p.id !== 'mc');
  const personal = (id: string): number => ((weights.personalBodies as readonly string[]).includes(id) ? weights.personalWeight : 1);
  const hard = (id: string): boolean => (weights.hardConjunctionBodies as readonly string[]).includes(id);
  const soft = (id: string): boolean => (weights.softeningBodies as readonly string[]).includes(id);

  const aspects: SynastryAspect[] = [];
  for (const pa of eligible(a)) {
    for (const pb of eligible(b)) {
      const hit = findAspect({ ...pa, speed: null }, { ...pb, speed: null }, (type) => config.synastryOrbs[type]);
      if (!hit) continue;
      const isHardConjunction = hit.type === 'conjunction' && (hard(pa.id) || hard(pb.id)) && !soft(pa.id) && !soft(pb.id);
      const base = isHardConjunction ? weights.aspects.conjunctionHard : weights.aspects[hit.type];
      const factor = personal(pa.id) * personal(pb.id);
      aspects.push({ a: pa.id, b: pb.id, type: hit.type, orb: hit.orb, harmony: base.harmony * factor, tension: base.tension * factor });
    }
  }
  aspects.sort((x, y) => y.harmony + y.tension - (x.harmony + x.tension) || x.orb - y.orb || (x.a + x.b < y.a + y.b ? -1 : 1));
  return {
    aspects,
    harmony: aspects.reduce((sum, x) => sum + x.harmony, 0),
    tension: aspects.reduce((sum, x) => sum + x.tension, 0),
  };
}

export type SkyOfDay = Readonly<{
  date: string;
  bodies: { id: PlanetId | 'north_node'; longitude: number; sign: SignId; retrograde: boolean }[];
  moon: { sign: SignId; phase: MoonPhase; elongation: number };
  retrogrades: PlanetId[];
  aspects: { a: PlanetId; b: PlanetId; type: AspectId; orb: number; applying: boolean | null }[];
  /** Changements de signe survenant ce jour-là (entre 00:00 et 24:00 UTC). */
  ingresses: { body: PlanetId; from: SignId; to: SignId }[];
}>;

/** Huit phases de 45°, centrées sur les quatre phases principales, d'après l'élongation Soleil–Lune. */
export const moonPhaseFromElongation = (elongation: number): MoonPhase =>
  MOON_PHASES[Math.floor(norm360(elongation + 22.5) / 45) % 8] ?? 'new_moon';

export function computeSkyWith(ephemeris: EphemerisPort, dateUtc: string, config: EngineConfig): SkyOfDay {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateUtc)) throw new Error(`Date invalide : ${dateUtc}`);
  const noon = ephemeris.julianDayUt(`${dateUtc}T12:00:00Z`);
  const positions = PLANET_IDS.map((id) => ({ id, ...ephemeris.position(noon, id) }));
  const node = ephemeris.position(noon, 'north_node');
  const at = (id: PlanetId): number => positions.find((p) => p.id === id)?.longitude ?? 0;
  const elongation = norm360(at('moon') - at('sun'));

  const aspects: SkyOfDay['aspects'] = [];
  for (let i = 0; i < positions.length; i += 1) {
    for (let j = i + 1; j < positions.length; j += 1) {
      const a = positions[i];
      const b = positions[j];
      if (!a || !b) continue;
      const hit = findAspect(a, b, () => config.skyOrb);
      if (hit) aspects.push({ a: a.id, b: b.id, ...hit });
    }
  }
  const ingresses: SkyOfDay['ingresses'] = [];
  for (const id of PLANET_IDS) {
    const from = signFromLongitude(ephemeris.position(noon - 0.5, id).longitude);
    const to = signFromLongitude(ephemeris.position(noon + 0.5, id).longitude);
    if (from !== to) ingresses.push({ body: id, from, to });
  }
  const round = (v: number): number => Math.round(norm360(v) * 1e6) / 1e6;
  return {
    date: dateUtc,
    bodies: [
      ...positions.map((p) => ({ id: p.id, longitude: round(p.longitude), sign: signFromLongitude(p.longitude), retrograde: p.speed < 0 })),
      { id: 'north_node' as const, longitude: round(node.longitude), sign: signFromLongitude(node.longitude), retrograde: false },
    ],
    moon: { sign: signFromLongitude(at('moon')), phase: moonPhaseFromElongation(elongation), elongation: Math.round(elongation * 1e4) / 1e4 },
    retrogrades: positions.filter((p) => p.speed < 0).map((p) => p.id),
    aspects,
    ingresses,
  };
}
