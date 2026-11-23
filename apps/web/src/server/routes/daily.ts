// GET /daily et GET /daily/questions (SPEC §7.5, §13.3, §14.9).
import { computeSky } from '@aurorya/astro-engine';
import type { DailyResponse, Locale, SignId, ToneMode } from '@aurorya/shared';
import { TONE_MODES } from '@aurorya/shared';
import type { AppDeps } from '../deps';
import { ApiFailure, defineRoute, isPremium } from '../http';

const DAY_MS = 86_400_000;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const DEFAULT_LIMIT = { configKey: 'limits.default_per_hour', fallback: 300, windowSeconds: 3600 } as const;

/** Numéro de jour julien entier d'une date civile (à midi UTC). */
export const julianDayNumber = (isoDate: string): number => Math.round(Date.parse(`${isoDate}T12:00:00Z`) / DAY_MS + 2440587.5);

/**
 * Question du jour, choisie sans IA : signe de la Lune à 12:00 UTC, puis
 * position = (numéro de jour julien) modulo (nombre de questions approuvées pour ce signe).
 */
export async function questionOfDay(deps: AppDeps, isoDate: string, locale: Locale): Promise<{ moonSign: SignId; moonPhase: string; text: string | null }> {
  const sky = computeSky(isoDate, deps.engineConfig);
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
      const sun = (await deps.sql.query<{ sun_sign: SignId }>('select sun_sign from public.charts where user_id = $1 and is_current', [user.uid])).rows[0];
      const horoscope = sun
        ? (await deps.sql.query<{ content: { headline: string; body: string } }>(
            'select content from public.daily_sign_horoscopes where day = $1 and sign = $2 and mode = $3 and locale = $4', [date, sun.sun_sign, mode, locale])).rows[0]
        : undefined;
      const body: DailyResponse = {
        date,
        sky: { moonSign: day.moonSign, moonPhase: day.moonPhase },
        signHoroscope: sun && horoscope ? { sign: sun.sun_sign, headline: horoscope.content.headline, body: horoscope.content.body } : null,
        question: day.text,
        // L'horoscope personnel est réservé au Premium ; sa génération arrive avec T-037.
        personal: { locked: !(await isPremium(deps, user.uid)) },
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
