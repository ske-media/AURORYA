import { type BirthInput, ChartPayloadSchema, PLANET_IDS, SIGN_IDS } from '@aurorya/shared';
import { describe, expect, it } from 'vitest';
import golden from '../__fixtures__/golden/horizons.v1.json';
import { findAspect } from './aspects';
import { canonicalJson, houseOf } from './chart';
import { DEFAULT_ENGINE_CONFIG as config, ENGINE_VERSION, computeChart, computeSky, computeSynastry, computeTransits, moonPhaseFromElongation } from './index';
import { norm360, signedDelta } from './math/angles';

const paris: BirthInput = {
  date: '1993-04-17', time: '14:35', timePrecision: 'exact', timeWindow: null, dstChoice: null,
  latitude: 48.8566, longitude: 2.3522, tzIana: 'Europe/Paris', houseSystem: 'placidus',
};
const chart = (over: Partial<BirthInput> = {}) => {
  const r = computeChart({ ...paris, ...over }, config);
  if (!r.ok) throw new Error(`échec inattendu : ${r.error.code}`);
  return r.value;
};
const body = (c: ReturnType<typeof chart>, id: string) => {
  const b = c.bodies.find((x) => x.id === id);
  if (!b) throw new Error(id);
  return b;
};

describe('computeChart', () => {
  it('produit un résultat conforme au schéma, versionné et déterministe', () => {
    const a = chart();
    expect(ChartPayloadSchema.safeParse(a).success).toBe(true);
    expect(a.engineVersion).toBe(ENGINE_VERSION);
    expect(a.chartHash).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(canonicalJson(chart())).toBe(canonicalJson(a));
    expect(chart({ time: '14:36' }).chartHash).not.toBe(a.chartHash);
    expect(a.input).toMatchObject({ utc: '1993-04-17T12:35:00Z', utcOffsetMinutes: 120, tzIana: 'Europe/Paris' });
  });

  it('retrouve de bout en bout les positions de référence de la NASA', () => {
    // Chaque instant de référence devient une naissance en temps universel.
    for (const index of [3, 17, 29, 41]) {
      const row = golden.positions.sun.rows[index];
      if (!row) throw new Error('ligne absente');
      const date = new Date((row.jdUt - 2440587.5) * 86400000);
      date.setUTCSeconds(0, 0);
      const jd = date.getTime() / 86400000 + 2440587.5;
      const c = chart({ date: date.toISOString().slice(0, 10), time: date.toISOString().slice(11, 16), tzIana: 'UTC', latitude: 0, longitude: 0 });
      for (const id of PLANET_IDS) {
        const ref = golden.positions[id].rows[index];
        const mine = body(c, id);
        if (!ref) throw new Error('ligne absente');
        // L'arrondi à la minute décale l'instant de moins d'une minute : on corrige par la vitesse calculée.
        const expected = ref.longitude + mine.speed * (jd - ref.jdUt);
        expect(Math.abs(signedDelta(expected, mine.longitude))).toBeLessThan(0.01);
        expect(mine.sign).toBe(SIGN_IDS[Math.floor(mine.longitude / 30)]);
        expect(mine.degree + mine.minute / 60).toBeLessThanOrEqual(mine.longitude % 30);
      }
    }
  });

  it('place chaque corps dans la maison délimitée par ses cuspides', () => {
    const c = chart();
    if (!c.houses || !c.angles) throw new Error('maisons attendues');
    expect(c.houseSystem).toBe('placidus');
    expect(c.houses[0]?.cusp).toBe(c.angles.asc.longitude);
    expect(c.houses[9]?.cusp).toBe(c.angles.mc.longitude);
    const cusps = c.houses.map((h) => h.cusp);
    for (const b of c.bodies) {
      const k = (b.house ?? 0) - 1;
      const width = norm360((cusps[(k + 1) % 12] ?? 0) - (cusps[k] ?? 0));
      expect(norm360(b.longitude - (cusps[k] ?? 0))).toBeLessThan(width);
    }
    expect(houseOf(norm360((cusps[3] ?? 0) + 0.001), cusps)).toBe(4);
  });

  it('respecte les orbes configurées et n’apparie jamais deux angles', () => {
    const c = chart();
    expect(c.aspects.length).toBeGreaterThan(5);
    for (const a of c.aspects) {
      const luminary = [a.a, a.b].some((x) => x === 'sun' || x === 'moon');
      const point = [a.a, a.b].some((x) => x === 'north_node' || x === 'asc' || x === 'mc');
      const max = (config.natalOrbs[a.type] + (luminary ? config.luminaryBonus : 0)) * (point ? config.pointOrbFactor : 1);
      expect(a.orb).toBeLessThanOrEqual(max);
      expect(a.a === 'asc' && a.b === 'mc').toBe(false);
      if (a.a === 'asc' || a.b === 'asc' || a.a === 'mc' || a.b === 'mc') expect(a.applying).toBeNull();
    }
  });

  it('compte double le Soleil, la Lune et l’Ascendant dans les dominantes', () => {
    const c = chart();
    const sum = (r: Record<string, number>) => Object.values(r).reduce((x, y) => x + y, 0);
    expect(sum(c.dominants.elements)).toBe(14);
    expect(sum(c.dominants.modalities)).toBe(14);
    expect(c.dominants.chartRuler?.modern).toBe(config.rulers.modern[c.angles?.asc.sign ?? 'aries']);
    for (const id of c.dominants.retrogrades) expect(body(c, id).speed).toBeLessThan(0);
    for (const s of c.dominants.stelliums) expect(s.bodies.length).toBeGreaterThanOrEqual(3);
  });

  it('sans heure : ni Ascendant, ni maisons, et le milieu de journée reste une hypothèse', () => {
    const c = chart({ time: null, timePrecision: 'unknown' });
    expect(c.angles).toBeNull();
    expect(c.houses).toBeNull();
    expect(c.houseSystem).toBeNull();
    expect(c.flags.timeAssumed).toBe(true);
    expect(c.dominants.chartRuler).toBeNull();
    expect(c.dominants.angular).toEqual([]);
    expect(c.bodies.every((b) => b.house === null)).toBe(true);
    expect(c.aspects.every((a) => a.a !== 'asc' && a.b !== 'mc')).toBe(true);
  });

  it('marque la Lune incertaine quand elle change de signe dans la journée, et écarte ses aspects', () => {
    // Recherche d'un jour où la Lune change de signe, grâce au moteur lui-même.
    let date = '';
    for (let d = 1; d <= 28 && !date; d += 1) {
      const candidate = `1993-05-${String(d).padStart(2, '0')}`;
      if (computeSky(candidate, config).ingresses.some((i) => i.body === 'moon')) date = candidate;
    }
    expect(date).not.toBe('');
    const c = chart({ date, time: null, timePrecision: 'unknown', tzIana: 'UTC' });
    const moon = body(c, 'moon');
    expect(moon.signUncertain).toBe(true);
    expect(moon.signCandidates?.length).toBe(2);
    expect(c.aspects.some((a) => a.a === 'moon' || a.b === 'moon')).toBe(false);
    // Les corps au signe incertain sortent des dominantes (la Lune y pèse 2, le Soleil 2, les autres 1).
    const excluded = c.bodies.filter((b) => b.signUncertain && b.id !== 'north_node').reduce((n, b) => n + (b.id === 'sun' || b.id === 'moon' ? 2 : 1), 0);
    expect(Object.values(c.dominants.elements).reduce((x, y) => x + y, 0)).toBe(12 - excluded);
    // Une plage de six heures peut lever l'incertitude.
    const narrowed = ['night', 'morning', 'afternoon', 'evening'].map((w) =>
      body(chart({ date, time: null, timePrecision: 'approx', timeWindow: w as 'night', tzIana: 'UTC' }), 'moon').signUncertain);
    expect(narrowed.filter(Boolean).length).toBe(1);
  });

  it('bascule sur le système de repli au-delà du cercle polaire', () => {
    const c = chart({ latitude: 69.6492, longitude: 18.9553, tzIana: 'Europe/Oslo' });
    expect(c.flags.houseSystemFallback).toBe(true);
    expect(c.houseSystem).toBe('porphyry');
    expect(c.houses).toHaveLength(12);
  });

  it('couvre l’hémisphère sud, la longitude ouest, 1900 et le signalement d’heure ambiguë', () => {
    expect(chart({ latitude: -33.8688, longitude: 151.2093, tzIana: 'Australia/Sydney' }).houseSystem).toBe('placidus');
    expect(chart({ latitude: 45.5019, longitude: -73.5674, tzIana: 'America/Toronto' }).input.utcOffsetMinutes).toBe(-240);
    expect(chart({ date: '1900-01-01', time: '00:00' }).bodies).toHaveLength(11);
    expect(chart({ date: '2021-10-31', time: '02:30' }).flags.dstAmbiguous).toBe(true);
    expect(computeChart({ ...paris, date: '2021-03-28', time: '02:30' }, config)).toEqual({ ok: false, error: { code: 'BIRTH_TIME_NONEXISTENT' } });
  });
});

describe('aspects', () => {
  const orb = () => 8;
  it('reconnaît chaque type et choisit le plus exact', () => {
    const at = (lon: number, speed: number | null = 1) => ({ id: 'x', longitude: lon, speed });
    expect(findAspect(at(10), at(12), orb)?.type).toBe('conjunction');
    expect(findAspect(at(10), at(190.5), orb)).toMatchObject({ type: 'opposition', orb: 0.5 });
    expect(findAspect(at(350), at(110), orb)?.type).toBe('trine');
    expect(findAspect(at(10), at(100), orb)?.type).toBe('square');
    expect(findAspect(at(10), at(70), orb)?.type).toBe('sextile');
    expect(findAspect(at(10), at(40), orb)).toBeNull();
  });
  it('distingue appliquant et séparant d’après les vitesses', () => {
    const slow = { id: 'a', longitude: 100, speed: 0.1 };
    expect(findAspect(slow, { id: 'b', longitude: 98, speed: 1 }, orb)?.applying).toBe(true);
    expect(findAspect(slow, { id: 'b', longitude: 102, speed: 1 }, orb)?.applying).toBe(false);
    expect(findAspect(slow, { id: 'b', longitude: 102, speed: -1 }, orb)?.applying).toBe(true);
    expect(findAspect(slow, { id: 'b', longitude: 188, speed: 1 }, orb)?.applying).toBe(true);
    expect(findAspect(slow, { id: 'b', longitude: 192, speed: 1 }, orb)?.applying).toBe(false);
    expect(findAspect(slow, { id: 'b', longitude: 102, speed: null }, orb)?.applying).toBeNull();
  });
});

describe('transits, synastrie, ciel du jour', () => {
  it('classe les transits et laisse la Lune au climat', () => {
    const natal = chart();
    const t = computeTransits(natal, '2026-11-23T11:00:00Z', config);
    expect(t.hits.every((h) => h.transiting !== 'moon')).toBe(true);
    expect(t.moon.house).toBeGreaterThanOrEqual(1);
    for (const h of t.hits) expect(h.orb).toBeLessThanOrEqual(config.transitOrbs[h.type]);
    const tier = (h: (typeof t.hits)[number]) =>
      config.transitRanking.slowBodies.includes(h.transiting) && (config.transitRanking.personalPoints as string[]).includes(h.natal) ? 0 : 1;
    for (let i = 1; i < t.hits.length; i += 1) {
      const [p, c] = [t.hits[i - 1], t.hits[i]];
      if (!p || !c) continue;
      expect(tier(p) < tier(c) || (tier(p) === tier(c) && p.orb <= c.orb)).toBe(true);
    }
    expect(computeTransits(natal, '2026-11-23T11:00:00Z', config)).toEqual(t);
  });

  it('donne une synastrie symétrique', () => {
    const a = chart();
    const b = chart({ date: '1990-11-02', time: '06:10', latitude: 45.764, longitude: 4.8357 });
    const ab = computeSynastry(a, b, config);
    const ba = computeSynastry(b, a, config);
    expect(ab.aspects.length).toBeGreaterThan(0);
    expect([ab.harmony, ab.tension]).toEqual([ba.harmony, ba.tension]);
    expect(ab.aspects.length).toBe(ba.aspects.length);
    expect(Number.isInteger(ab.harmony) && Number.isInteger(ab.tension)).toBe(true);
    const self = computeSynastry(a, a, config);
    expect(self.aspects.filter((x) => x.a === x.b).every((x) => x.type === 'conjunction')).toBe(true);
  });

  it('découpe l’élongation en huit phases', () => {
    expect([0, 22.4, 22.6, 90, 135, 180, 225, 270, 315, 337.6].map(moonPhaseFromElongation)).toEqual([
      'new_moon', 'new_moon', 'waxing_crescent', 'first_quarter', 'waxing_gibbous', 'full_moon',
      'waning_gibbous', 'last_quarter', 'waning_crescent', 'new_moon',
    ]);
  });

  it('confirme la nouvelle lune du 7 janvier 2027 en Capricorne (SPEC, Annexe E)', () => {
    const sky = computeSky('2027-01-07', config);
    expect(sky.moon.phase).toBe('new_moon');
    expect(sky.bodies.find((b) => b.id === 'sun')?.sign).toBe('capricorn');
    // Conjonction exacte annoncée à 21 h 24, heure de Paris, soit 20:24 UTC : l'élongation à midi UTC
    // doit donc valoir environ −8,4 h × (vitesse relative de la Lune).
    const hoursBefore = (360 - sky.moon.elongation) / ((13.2 - 1.0) / 24);
    expect(hoursBefore).toBeGreaterThan(7.4);
    expect(hoursBefore).toBeLessThan(9.4);
  });
});
