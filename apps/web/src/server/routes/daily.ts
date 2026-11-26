// GET /daily et GET /daily/questions (SPEC §7.5, §13.3, §14.9).
import { computeSky, computeTransits } from '@aurorya/astro-engine';
import type { ChartPayload, DailyResponse, Locale, SignId, ToneMode } from '@aurorya/shared';
import { ChartPayloadSchema, TONE_MODES, formatTransit } from '@aurorya/shared';
import { z } from 'zod';
import type { AppDeps } from '../deps';
import { ApiFailure, defineRoute, isPremium } from '../http';
import { memoize } from '../memo';
import { configValue } from '../remote-config';
import { loadKb } from './roasts';

const DAY_MS = 86_400_000;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
/** Nombre de transits retenus pour l'horoscope personnel (SPEC §14.4). */
const PERSONAL_TRANSITS = 3;
const capitalize = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);
const DEFAULT_LIMIT = { configKey: 'limits.default_per_hour', fallback: 300, windowSeconds: 3600 } as const;

/** Numéro de jour julien entier d'une date civile (à midi UTC). */
export const julianDayNumber = (isoDate: string): number => Math.round(Date.parse(`${isoDate}T12:00:00Z`) / DAY_MS + 2440587.5);

/**
 * Question du jour, choisie sans IA : signe de la Lune à 12:00 UTC, puis
 * position = (numéro de jour julien) modulo (nombre de questions approuvées pour ce signe).
 */
/** Le ciel d'un jour est le même pour toutes : calculé une fois par instance et par configuration. */
const skyByConfig = new WeakMap<AppDeps['engineConfig'], (date: string) => ReturnType<typeof computeSky>>();
export const skyOf = (deps: AppDeps, isoDate: string): ReturnType<typeof computeSky> => {
  let memo = skyByConfig.get(deps.engineConfig);
  if (!memo) {
    memo = memoize((date: string) => computeSky(date, deps.engineConfig), 32);
    skyByConfig.set(deps.engineConfig, memo);
  }
  return memo(isoDate);
};

export async function questionOfDay(deps: AppDeps, isoDate: string, locale: Locale): Promise<{ moonSign: SignId; moonPhase: string; text: string | null }> {
  const sky = skyOf(deps, isoDate);
  const { rows } = await deps.sql.query<{ text: string }>(
    `select text from public.daily_questions where locale = $1 and moon_sign = $2 and status = 'approved' order by position`, [locale, sky.moon.sign]);
  const text = rows.length > 0 ? rows[julianDayNumber(isoDate) % rows.length]?.text ?? null : null;
  return { moonSign: sky.moon.sign, moonPhase: sky.moon.phase, text };
}

const query = (request: Request): URLSearchParams => new URL(request.url).searchParams;
/** La date locale de l'appareil doit rester à un jour près de la date UTC du serveur. */
function requireNearToday(date: string | null, now: Date): string {
  if (!date || !ISO_DATE.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) throw new ApiFailure('VALIDATION_FAILED', 'date invalide', { fields: ['date'] });
  const today = Date.parse(`${now.toISOString().slice(0, 10)}T00:00:00Z`);
  if (Math.abs(Date.parse(`${date}T00:00:00Z`) - today) > DAY_MS) throw new ApiFailure('VALIDATION_FAILED', 'date trop éloignée', { fields: ['date'] });
  return date;
}

export const getDaily = (request: Request, deps: AppDeps): Promise<Response> =>
  defineRoute({
    name: 'GET /daily', auth: 'required', rateLimit: DEFAULT_LIMIT,
    handler: async ({ user, locale }) => {
      const params = query(request);
      const date = requireNearToday(params.get('date'), deps.now());
      const modeParam = params.get('mode');
      const mode: ToneMode = (TONE_MODES as readonly string[]).includes(modeParam ?? '') ? (modeParam as ToneMode) : 'cash';
      const day = await questionOfDay(deps, date, locale);
      const current = (await deps.sql.query<{ sun_sign: SignId; payload: unknown }>('select sun_sign, payload from public.charts where user_id = $1 and is_current', [user.uid])).rows[0];
      const chart: ChartPayload | null = current ? ChartPayloadSchema.parse(current.payload) : null;
      const transits = chart ? computeTransits(chart, `${date}T12:00:00Z`, deps.engineConfig).hits.slice(0, PERSONAL_TRANSITS) : [];
      const natalSign = (id: string): SignId | null =>
        chart?.bodies.find((b) => b.id === id)?.sign ?? (id === 'asc' ? chart?.angles?.asc.sign : id === 'mc' ? chart?.angles?.mc.sign : undefined) ?? null;
      const kbKeyOf = (id: string): string | null => {
        const sign = natalSign(id);
        return sign === null ? null : id === 'asc' || id === 'mc' ? `${id}_sign:${sign}` : `planet_sign:${id}:${sign}`;
      };
      const kbVersion = await configValue(deps.sql, deps.now(), 'content.kb_version', z.string(), '1');
      const keys = [...(current ? [`planet_sign:sun:${current.sun_sign}`] : []), ...transits.map((hit) => kbKeyOf(hit.natal)).filter((k): k is string => k !== null)];
      const kb = await loadKb(deps, locale, kbVersion, [...new Set(keys)]);

      const generated = current
        ? (await deps.sql.query<{ content: { headline: string; body: string } }>(
            'select content from public.daily_sign_horoscopes where day = $1 and sign = $2 and mode = $3 and locale = $4', [date, current.sun_sign, mode, locale])).rows[0]
        : undefined;
      // Jamais d'écran vide : sans texte généré, le repli vient de la fiche du Soleil dans ce signe.
      const sunEntry = current ? kb(`planet_sign:sun:${current.sun_sign}`) : null;
      const signHoroscope: DailyResponse['signHoroscope'] = !current ? null
        : generated ? { sign: current.sun_sign, headline: generated.content.headline, body: generated.content.body, status: 'ok' }
        : sunEntry ? { sign: current.sun_sign, headline: capitalize(sunEntry.keywords.slice(0, 3).join(' · ')), body: sunEntry.summary[mode], status: 'fallback' }
        : null;

      const label = (hit: (typeof transits)[number]): string => formatTransit(locale, hit.transiting, hit.natal, hit.type, mode === 'expert');
      const headline = transits[0] ? label(transits[0]) : null;
      const body: DailyResponse = {
        date,
        sky: { moonSign: day.moonSign, moonPhase: day.moonPhase },
        signHoroscope,
        question: day.text,
        // Sans droit, seul le nom du transit part (D-014). Avec le droit : les transits et, en attendant la
        // génération (T-037), le résumé de la fiche du point natal touché.
        personal: (await isPremium(deps, user.uid))
          ? { locked: false, headline, items: transits.flatMap((hit) => { const key = kbKeyOf(hit.natal); const entry = key ? kb(key) : null; return entry ? [{ label: label(hit), text: entry.summary[mode] }] : []; }) }
          : { locked: true, headline },
      };
      return { body };
    },
  })(request, deps);

export const getDailyQuestions = (request: Request, deps: AppDeps): Promise<Response> =>
  defineRoute({
    name: 'GET /daily/questions', auth: 'required', rateLimit: DEFAULT_LIMIT,
    handler: async ({ locale }) => {
      const params = query(request);
      const from = requireNearToday(params.get('from'), deps.now());
      const days = Number(params.get('days') ?? '7');
      if (!Number.isInteger(days) || days < 1 || days > 7) throw new ApiFailure('VALIDATION_FAILED', 'nombre de jours invalide', { fields: ['days'] });
      const questions: { date: string; text: string }[] = [];
      for (let i = 0; i < days; i += 1) {
        const date = new Date(Date.parse(`${from}T00:00:00Z`) + i * DAY_MS).toISOString().slice(0, 10);
        const { text } = await questionOfDay(deps, date, locale);
        if (text !== null) questions.push({ date, text });
      }
      return { body: { questions } };
    },
  })(request, deps);
