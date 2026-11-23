import { readFileSync } from 'node:fs';
import type { BirthInput } from '@aurorya/shared';
import { describe, expect, it } from 'vitest';
import { TZDATA_VERSION, resolveBirthInstant } from './resolve-birth-instant';

const base: BirthInput = {
  date: '1993-04-17', time: '14:35', timePrecision: 'exact', timeWindow: null, dstChoice: null,
  latitude: 48.8566, longitude: 2.3522, tzIana: 'Europe/Paris', houseSystem: 'placidus',
};
const resolve = (over: Partial<BirthInput>) => resolveBirthInstant({ ...base, ...over });
const value = (over: Partial<BirthInput>) => {
  const r = resolve(over);
  if (!r.ok) throw new Error(`échec inattendu : ${r.error.code}`);
  return r.value;
};

/** Décalage UTC en minutes selon la base de fuseaux du système (ICU), indépendante de celle du moteur. */
const systemOffsetMinutes = (utcIso: string, zone: string): number => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: zone, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric',
  }).formatToParts(new Date(utcIso));
  const get = (type: string): number => Number(parts.find((p) => p.type === type)?.value);
  const local = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return Math.round((local - Date.parse(utcIso)) / 60000);
};

describe('resolveBirthInstant', () => {
  it('déclare la version de la base IANA réellement embarquée', () => {
    const readme = readFileSync(new URL('../node_modules/@js-joda/timezone/README.md', import.meta.url), 'utf8');
    expect(readme).toContain(`<strong>${TZDATA_VERSION}</strong>`);
  });

  it('convertit une heure exacte', () => {
    const r = value({});
    expect(r).toEqual({ utc: '1993-04-17T12:35:00Z', utcOffsetMinutes: 120, dstAmbiguous: false, timeAssumed: false, window: null });
    expect(systemOffsetMinutes(r.utc, 'Europe/Paris')).toBe(120);
  });

  it('gère minuit, 23 h 59 et le 29 février', () => {
    expect(value({ date: '1992-02-29', time: '00:00' }).utc).toBe('1992-02-28T23:00:00Z');
    expect(value({ date: '1992-02-29', time: '23:59' }).utc).toBe('1992-02-29T22:59:00Z');
    expect(resolve({ date: '1993-02-29' })).toEqual({ ok: false, error: { code: 'INVALID_INPUT', detail: 'date' } });
  });

  it('refuse une heure inexistante (passage à l’heure d’été)', () => {
    // La base du système confirme le saut : +60 min juste avant 01:00 UTC, +120 min ensuite.
    expect(systemOffsetMinutes('2021-03-28T00:59:59Z', 'Europe/Paris')).toBe(60);
    expect(systemOffsetMinutes('2021-03-28T01:00:00Z', 'Europe/Paris')).toBe(120);
    expect(resolve({ date: '2021-03-28', time: '02:30' })).toEqual({ ok: false, error: { code: 'BIRTH_TIME_NONEXISTENT' } });
    expect(value({ date: '2021-03-28', time: '03:00' }).utc).toBe('2021-03-28T01:00:00Z');
  });

  it('signale une heure ambiguë et applique le choix', () => {
    const first = value({ date: '2021-10-31', time: '02:30' });
    expect(first).toMatchObject({ utc: '2021-10-31T00:30:00Z', utcOffsetMinutes: 120, dstAmbiguous: true });
    expect(value({ date: '2021-10-31', time: '02:30', dstChoice: 'first' })).toMatchObject({ utc: '2021-10-31T00:30:00Z', dstAmbiguous: false });
    expect(value({ date: '2021-10-31', time: '02:30', dstChoice: 'second' })).toMatchObject({ utc: '2021-10-31T01:30:00Z', utcOffsetMinutes: 60, dstAmbiguous: false });
    expect(systemOffsetMinutes('2021-10-31T00:30:00Z', 'Europe/Paris')).toBe(120);
    expect(systemOffsetMinutes('2021-10-31T01:30:00Z', 'Europe/Paris')).toBe(60);
  });

  it('donne une plage et son milieu pour une heure approximative', () => {
    const r = value({ time: null, timePrecision: 'approx', timeWindow: 'evening' });
    expect(r).toEqual({
      utc: '1993-04-17T19:00:00Z', utcOffsetMinutes: 120, dstAmbiguous: false, timeAssumed: false,
      window: { startUtc: '1993-04-17T16:00:00Z', endUtc: '1993-04-17T21:59:59Z' },
    });
  });

  it('ne présente jamais midi comme une heure de naissance quand elle est inconnue', () => {
    const r = value({ time: null, timePrecision: 'unknown' });
    expect(r.timeAssumed).toBe(true);
    expect(r.utc).toBe('1993-04-17T10:00:00Z');
    expect(r.window).toEqual({ startUtc: '1993-04-16T22:00:00Z', endUtc: '1993-04-17T21:59:59Z' });
  });

  it('gère un fuseau à décalage non entier et une longitude ouest', () => {
    expect(value({ tzIana: 'Asia/Kolkata', date: '1990-06-01', time: '12:00' })).toMatchObject({ utc: '1990-06-01T06:30:00Z', utcOffsetMinutes: 330 });
    const montreal = value({ tzIana: 'America/Toronto', date: '1985-01-15', time: '08:00' });
    expect(montreal.utcOffsetMinutes).toBe(systemOffsetMinutes(montreal.utc, 'America/Toronto'));
    expect(montreal.utcOffsetMinutes).toBe(-300);
  });

  it('refuse les entrées invalides', () => {
    expect(resolve({ date: '1899-12-31' })).toEqual({ ok: false, error: { code: 'BIRTH_DATE_OUT_OF_RANGE' } });
    expect(resolve({ tzIana: 'Mars/Olympus' })).toEqual({ ok: false, error: { code: 'UNKNOWN_TIMEZONE', detail: 'Mars/Olympus' } });
    expect(resolve({ time: null }).ok).toBe(false);
    expect(resolve({ timeWindow: 'night' }).ok).toBe(false);
    expect(resolve({ latitude: 91 }).ok).toBe(false);
  });

  // Contrôle croisé avec la base du système pour les années et villes exigées par la SPEC §11.8.
  const zones = ['Europe/Paris', 'Europe/Zurich', 'Europe/Brussels', 'Europe/Luxembourg', 'America/Toronto'];
  const years = [1900, 1945, 1975, 1976, 1980, 1995, 2010, 2026];
  it.each(zones)('%s : concorde avec la base du système', (zone) => {
    const mismatches: string[] = [];
    for (const year of years) for (const month of ['01', '04', '07', '10']) {
      const r = resolve({ tzIana: zone, date: `${year}-${month}-15`, time: '12:00' });
      if (!r.ok) throw new Error(r.error.code);
      const system = systemOffsetMinutes(r.value.utc, zone);
      if (system !== r.value.utcOffsetMinutes) mismatches.push(`${year}-${month} moteur ${r.value.utcOffsetMinutes} système ${system}`);
    }
    expect(mismatches).toEqual([]);
  });
});
