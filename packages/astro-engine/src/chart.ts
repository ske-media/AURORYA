// Calcul du thème natal (SPEC §11.5, §11.6).
import { createHash } from 'node:crypto';
import {
  type Aspect, type AspectId, type BirthInput, type ChartBody, type ChartPayload, ChartPayloadSchema,
  ELEMENTS, type Element, MODALITIES, type Modality, PLANET_IDS, type PlanetId, type Result, type SignId,
  err, ok, signElement, signFromLongitude, signModality,
} from '@aurorya/shared';
import { findAspect } from './aspects';
import type { EngineConfig } from './config';
import { norm360, signedDelta } from './math/angles';
import type { EphemerisPort, RawHouses } from './ports/ephemeris-port';
import { type BirthInputError, TZDATA_VERSION, resolveBirthInstant } from './resolve-birth-instant';

/** Incrémenté à tout changement de résultat (SPEC §11.3). */
export const ENGINE_VERSION = '1.0.0';

export type EngineError = BirthInputError | Readonly<{ code: 'HOUSES_UNAVAILABLE'; detail?: string }>;

const CHART_BODIES = [...PLANET_IDS, 'north_node'] as const;
const round6 = (value: number): number => Math.round(value * 1e6) / 1e6;
const roundLongitude = (value: number): number => {
  const rounded = round6(norm360(value));
  return rounded >= 360 ? 0 : rounded;
};

const split = (longitude: number): { sign: SignId; degree: number; minute: number } => {
  const inSign = longitude % 30;
  const degree = Math.floor(inSign);
  return { sign: signFromLongitude(longitude), degree, minute: Math.min(59, Math.floor((inSign - degree) * 60)) };
};

/** Maison occupée par une longitude, d'après les douze cuspides. */
export const houseOf = (longitude: number, cusps: readonly number[]): number => {
  for (let k = 0; k < 12; k += 1) {
    const start = cusps[k] ?? 0;
    const width = norm360((cusps[(k + 1) % 12] ?? 0) - start);
    if (norm360(longitude - start) < width) return k + 1;
  }
  return 12;
};

/** Sérialisation canonique : clés triées récursivement. */
export const canonicalJson = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(',')}}`;
  }
  return JSON.stringify(value);
};

export function computeChartWith(ephemeris: EphemerisPort, rawInput: BirthInput, config: EngineConfig): Result<ChartPayload, EngineError> {
  const resolved = resolveBirthInstant(rawInput);
  if (!resolved.ok) return resolved;
  const instant = resolved.value;
  const input = rawInput;
  const exact = input.timePrecision === 'exact';
  const jd = ephemeris.julianDayUt(instant.utc);

  // Maisons : seulement avec une heure exacte ; repli si Placidus échoue ou au-delà du seuil polaire.
  let houses: RawHouses | null = null;
  let houseSystem: 'placidus' | 'porphyry' | null = null;
  let houseSystemFallback = false;
  if (exact) {
    const primary = Math.abs(input.latitude) > config.polarLatitudeThreshold
      ? null
      : ephemeris.houses(jd, input.latitude, input.longitude, config.houseSystem);
    if (primary?.ok) {
      houses = primary.value;
      houseSystem = config.houseSystem;
    } else {
      const fallback = ephemeris.houses(jd, input.latitude, input.longitude, config.houseSystemFallback);
      if (!fallback.ok) return err({ code: 'HOUSES_UNAVAILABLE', detail: `latitude ${input.latitude}` });
      houses = fallback.value;
      houseSystem = config.houseSystemFallback;
      houseSystemFallback = true;
    }
  }
  const cusps = houses ? houses.cusps.map(roundLongitude) : null;

  const windowJd = instant.window
    ? ([ephemeris.julianDayUt(instant.window.startUtc), ephemeris.julianDayUt(instant.window.endUtc)] as const)
    : null;

  const bodies: ChartBody[] = CHART_BODIES.map((id) => {
    const position = ephemeris.position(jd, id);
    const longitude = roundLongitude(position.longitude);
    const speed = round6(position.speed);
    let signCandidates: SignId[] | null = null;
    if (windowJd) {
      const signs = [windowJd[0], jd, windowJd[1]].map((t) => signFromLongitude(roundLongitude(ephemeris.position(t, id).longitude)));
      const distinct = [...new Set(signs)];
      if (distinct.length > 1) signCandidates = distinct;
    }
    return {
      id,
      longitude,
      latitude: round6(position.latitude),
      speed,
      ...split(longitude),
      house: cusps ? houseOf(longitude, cusps) : null,
      retrograde: id !== 'north_node' && speed < 0,
      signUncertain: signCandidates !== null,
      signCandidates,
    };
  });

  const anglePoint = (value: number): { longitude: number; sign: SignId; degree: number; minute: number } => {
    const longitude = roundLongitude(value);
    return { longitude, ...split(longitude) };
  };
  const angles = houses ? { asc: anglePoint(houses.asc), mc: anglePoint(houses.mc) } : null;

  // Aspects entre toutes les paires, dans l'ordre canonique. Deux angles ne forment pas d'aspect entre eux.
  const moon = bodies.find((b) => b.id === 'moon');
  const points = [
    ...bodies.filter((b) => !(b.id === 'moon' && moon?.signUncertain)).map((b) => ({ id: b.id, longitude: b.longitude, speed: b.speed as number | null })),
    ...(angles ? [{ id: 'asc', longitude: angles.asc.longitude, speed: null }, { id: 'mc', longitude: angles.mc.longitude, speed: null }] : []),
  ];
  const isPoint = (id: string): boolean => id === 'north_node' || id === 'asc' || id === 'mc';
  const isLuminary = (id: string): boolean => id === 'sun' || id === 'moon';
  const aspects: Aspect[] = [];
  for (let i = 0; i < points.length; i += 1) {
    for (let j = i + 1; j < points.length; j += 1) {
      const a = points[i];
      const b = points[j];
      if (!a || !b || (a.speed === null && b.speed === null)) continue;
      const allowed = (type: AspectId): number =>
        (config.natalOrbs[type] + (isLuminary(a.id) || isLuminary(b.id) ? config.luminaryBonus : 0)) *
        (isPoint(a.id) || isPoint(b.id) ? config.pointOrbFactor : 1);
      const hit = findAspect(a, b, allowed);
      if (hit) aspects.push({ a: a.id as Aspect['a'], b: b.id as Aspect['b'], ...hit });
    }
  }

  // Dominantes : Soleil, Lune et Ascendant comptent double. Un corps au signe incertain est ignoré.
  const elements = Object.fromEntries(ELEMENTS.map((e) => [e, 0])) as Record<Element, number>;
  const modalities = Object.fromEntries(MODALITIES.map((m) => [m, 0])) as Record<Modality, number>;
  const count = (sign: SignId, weight: number): void => {
    elements[signElement(sign)] += weight;
    modalities[signModality(sign)] += weight;
  };
  const planets = bodies.filter((b): b is ChartBody & { id: PlanetId } => b.id !== 'north_node');
  for (const body of planets) if (!body.signUncertain) count(body.sign, isLuminary(body.id) ? 2 : 1);
  if (angles) count(angles.asc.sign, 2);

  const stelliums: ChartPayload['dominants']['stelliums'] = [];
  const group = (kind: 'sign' | 'house', key: (b: ChartBody) => string | null): void => {
    const groups = new Map<string, PlanetId[]>();
    for (const body of planets) {
      const k = key(body);
      if (k !== null && !body.signUncertain) groups.set(k, [...(groups.get(k) ?? []), body.id]);
    }
    for (const [k, members] of groups) if (members.length >= config.stelliumMinBodies) stelliums.push({ kind, key: k, bodies: members });
  };
  group('sign', (b) => b.sign);
  group('house', (b) => (b.house === null ? null : String(b.house)));

  const angular = angles
    ? planets
        .filter((b) => [0, 90, 180, 270].some((offset) => {
          const axis = offset % 180 === 0 ? angles.asc.longitude + offset : angles.mc.longitude + (offset - 90);
          return Math.abs(signedDelta(axis, b.longitude)) <= config.angularOrb;
        }))
        .map((b) => b.id)
    : [];

  const normalizedInput = {
    date: input.date, time: input.time, timePrecision: input.timePrecision, timeWindow: input.timeWindow,
    dstChoice: input.dstChoice, latitude: round6(input.latitude), longitude: round6(input.longitude),
    tzIana: input.tzIana, houseSystem: input.houseSystem,
  };
  const chartHash = `sha256:${createHash('sha256')
    .update(canonicalJson({ input: normalizedInput, engineVersion: ENGINE_VERSION, configVersion: config.configVersion }))
    .digest('hex')}`;

  const info = ephemeris.info();
  const payload: ChartPayload = {
    schemaVersion: 1,
    engineVersion: ENGINE_VERSION,
    configVersion: config.configVersion,
    ephemeris: info.ephemeris,
    libraryVersion: info.libraryVersion,
    tzdataVersion: TZDATA_VERSION,
    chartHash,
    input: {
      timePrecision: input.timePrecision,
      tzIana: input.tzIana,
      utc: instant.utc,
      utcOffsetMinutes: instant.utcOffsetMinutes,
      julianDayUt: Math.round(jd * 1e8) / 1e8,
    },
    flags: { timeAssumed: instant.timeAssumed, dstAmbiguous: instant.dstAmbiguous, houseSystemFallback },
    houseSystem,
    bodies,
    angles,
    houses: cusps ? cusps.map((cusp, k) => ({ house: k + 1, cusp, sign: signFromLongitude(cusp) })) : null,
    aspects,
    dominants: {
      elements,
      modalities,
      chartRuler: angles ? { modern: config.rulers.modern[angles.asc.sign] as PlanetId, traditional: config.rulers.traditional[angles.asc.sign] as PlanetId } : null,
      stelliums,
      angular,
      retrogrades: planets.filter((b) => b.retrograde).map((b) => b.id),
    },
  };
  return ok(ChartPayloadSchema.parse(payload));
}
