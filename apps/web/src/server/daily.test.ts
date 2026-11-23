import { RoleCatalogSchema } from '@aurorya/ai';
import { DEFAULT_ENGINE_CONFIG, computeSky } from '@aurorya/astro-engine';
import { DailyResponseSchema, SIGN_IDS } from '@aurorya/shared';
import { afterAll, beforeAll, beforeEach, describe, expect, inject, it } from 'vitest';
import rolesJson from '../../../../content/roles/roles.v1.json';
import type { AppDeps } from './deps';
import { createLogger } from './log';
import { createNameFilter } from './names';
import { createPgSql } from './pg-sql';
import { invalidateConfigCache } from './remote-config';
import { getDaily, getDailyQuestions, julianDayNumber } from './routes/daily';

const pg = inject('pg');
const { sql, close } = createPgSql({ host: pg.host, port: pg.port, user: 'postgres', database: 'postgres' });
const UID = '00000000-0000-4000-8000-0000000000d1';
const now = new Date('2026-11-23T10:00:00Z');
const deps: AppDeps = {
  sql, auth: { verify: async (t) => (t === 'ok' ? { uid: UID, isAnonymous: true } : null) }, logger: createLogger(() => undefined), now: () => now, llm: null,
  prompts: {} as AppDeps['prompts'], engineConfig: DEFAULT_ENGINE_CONFIG, roleCatalog: RoleCatalogSchema.parse(rolesJson), publicSiteUrl: null, nameFilter: createNameFilter([]),
};
const get = (route: (r: Request, d: AppDeps) => Promise<Response>, search: string, token: string | null = 'ok') =>
  route(new Request(`https://test.invalid/api/v1/daily?${search}`, { headers: token ? { authorization: `Bearer ${token}` } : {} }), deps);

beforeAll(async () => {
  await sql.query('insert into auth.users (id, is_anonymous) values ($1, true)', [UID]);
  await sql.query('delete from public.daily_questions');
  for (const sign of SIGN_IDS) for (let i = 0; i < 3; i += 1) {
    await sql.query(`insert into public.daily_questions (locale, moon_sign, position, text, status) values ('fr', $1, $2, $3, $4)`, [sign, i, `Question ${sign} ${'abc'[i]} ?`, i === 2 ? 'draft' : 'approved']);
  }
});
afterAll(close);
beforeEach(async () => {
  await sql.query('truncate public.rate_limits');
  invalidateConfigCache(sql);
});

describe('GET /daily', () => {
  it('calcule le numéro de jour julien', () => {
    expect(julianDayNumber('2000-01-01')).toBe(2451545);
    expect(julianDayNumber('2026-11-23') - julianDayNumber('2026-11-22')).toBe(1);
  });
  it('donne le climat lunaire du moteur et la question du jour, la même pour toutes', async () => {
    const response = await get(getDaily, 'date=2026-11-23&mode=cash');
    expect(response.status).toBe(200);
    const body = DailyResponseSchema.parse(await response.json());
    const sky = computeSky('2026-11-23', DEFAULT_ENGINE_CONFIG);
    expect(body.sky).toEqual({ moonSign: sky.moon.sign, moonPhase: sky.moon.phase });
    // Deux questions approuvées par signe : position = jour julien modulo 2. Le brouillon n'est jamais servi.
    expect(body.question).toBe(`Question ${sky.moon.sign} ${'ab'[julianDayNumber('2026-11-23') % 2]} ?`);
    expect(body.signHoroscope).toBeNull();
    expect(body.personal).toEqual({ locked: true });
  });
  it('refuse une date mal formée ou éloignée de plus d’un jour, et une requête sans jeton', async () => {
    expect((await get(getDaily, 'date=2026-11-24')).status).toBe(200);
    expect((await get(getDaily, 'date=2026-11-25')).status).toBe(400);
    expect((await get(getDaily, 'date=hier')).status).toBe(400);
    expect((await get(getDaily, '')).status).toBe(400);
    expect((await get(getDaily, 'date=2026-11-23', null)).status).toBe(401);
  });
  it('liste jusqu’à sept jours de questions pour programmer les notifications locales', async () => {
    const body = await (await get(getDailyQuestions, 'from=2026-11-23&days=7')).json();
    expect(body.questions).toHaveLength(7);
    expect(body.questions[0]).toMatchObject({ date: '2026-11-23' });
    expect(body.questions[6].date).toBe('2026-11-29');
    expect((await get(getDailyQuestions, 'from=2026-11-23&days=8')).status).toBe(400);
    // Jamais la même question deux jours de suite quand la Lune reste dans le même signe.
    for (let i = 1; i < 7; i += 1) expect(body.questions[i].text).not.toBe(body.questions[i - 1].text);
  });
});
