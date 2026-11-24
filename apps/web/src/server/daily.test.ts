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
import { memoize } from './memo';
import { getDaily, getDailyQuestions, julianDayNumber, skyOf } from './routes/daily';

const pg = inject('pg');
const { sql, close } = createPgSql({ host: pg.host, port: pg.port, user: 'postgres', database: 'postgres' });
const UID = '00000000-0000-4000-8000-0000000000d1';
const now = new Date('2026-11-23T10:00:00Z');
const deps: AppDeps = {
  sql, auth: { verify: async (t) => (t === 'ok' ? { uid: UID, isAnonymous: true } : null) }, logger: createLogger(() => undefined), now: () => now, llm: null,
  prompts: {} as AppDeps['prompts'], engineConfig: DEFAULT_ENGINE_CONFIG, roleCatalog: RoleCatalogSchema.parse(rolesJson), deleteAuthUser: async (uid) => void (await sql.query('delete from auth.users where id = $1', [uid])), publicSiteUrl: null, nameFilter: createNameFilter([]),
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

describe('mémoïsation', () => {
  it('ne calcule qu’une fois par clé, et oublie la plus ancienne au-delà de la borne', () => {
    let calls = 0;
    const square = memoize((k: string) => { calls += 1; return k.length; }, 2);
    expect([square('a'), square('a'), square('bb')]).toEqual([1, 1, 2]);
    expect(calls).toBe(2);
    square('a');
    square('ccc');
    expect(square.size()).toBe(2);
    square('a');
    expect(calls).toBe(3);
    square('bb');
    expect(calls).toBe(4);
  });
  it('ne recalcule pas le ciel du jour', () => {
    expect(skyOf(deps, '2026-11-24')).toBe(skyOf(deps, '2026-11-24'));
  });
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

// Bout en bout avec les contenus réels du dépôt : fiches d'interprétation et questions importées par leurs
// fichiers SQL, thème calculé par le moteur, roast servi par repli (aucun fournisseur d'IA).
describe('contenus réels', async () => {
  const { execFileSync } = await import('node:child_process');
  const { validateRoast, buildRoastSheet } = await import('@aurorya/ai');
  const { KbEntrySchema, ChartPayloadSchema, RoastResponseSchema, TONE_MODES } = await import('@aurorya/shared');
  const { buildRoastPrompts } = await import('./prompts');
  const { postCharts } = await import('./routes/charts');
  const { putProfile } = await import('./routes/profile');
  const { postRoasts } = await import('./routes/roasts');
  const { readFileSync } = await import('node:fs');
  const root = new URL('../../../../', import.meta.url);
  const psql = (file: string): void => void execFileSync('psql', ['-X', '-q', '-v', 'ON_ERROR_STOP=1', '-h', pg.host, '-p', String(pg.port), '-U', 'postgres', '-d', 'postgres', '-f', new URL(file, root).pathname], { stdio: 'pipe' });
  const real: AppDeps = { ...deps, prompts: buildRoastPrompts((p) => { try { return readFileSync(new URL(`content/prompts/${p}`, root), 'utf8'); } catch { return null; } }, 'Ava') };
  const call = (route: (r: Request, d: AppDeps) => Promise<Response>, method: string, body: unknown) =>
    route(new Request('https://test.invalid/x', { method, body: JSON.stringify(body), headers: { authorization: 'Bearer ok' } }), real);

  it('importe les fiches et les questions', async () => {
    psql('supabase/seed/kb.v1.sql');
    psql('supabase/seed/questions.sql');
    expect(Number((await sql.query<{ n: string }>(`select count(*) as n from public.interpretation_kb where locale = 'fr' and kb_version = '1' and review_status = 'draft_ai'`)).rows[0]?.n)).toBe(156);
    expect(Number((await sql.query<{ n: string }>(`select count(*) as n from public.daily_questions where locale = 'fr' and status = 'approved'`)).rows[0]?.n)).toBe(120);
    const question = (await (await get(getDaily, 'date=2026-11-23')).json()).question as string;
    expect(question.endsWith('?')).toBe(true);
  });

  it('sert un roast de repli valide dans les trois modes, pour plusieurs thèmes', async () => {
    await sql.query(`insert into public.geo_places (geoname_id, name, ascii_name, country_code, latitude, longitude, population, tz_iana, search_text)
      values (6077243, 'Montréal', 'Montreal', 'CA', 45.50884, -73.58781, 1600000, 'America/Toronto', 'montreal') on conflict do nothing`);
    await sql.query(`update public.remote_config set value = '50' where key in ('quota.birth_edits_per_30d', 'limits.charts_per_hour', 'limits.roasts_per_hour')`);
    invalidateConfigCache(sql);
    await call(putProfile, 'PUT', { firstName: 'Camille', grammaticalGender: 'n' });
    const births = [
      { date: '1993-04-17', time: '14:35', timePrecision: 'exact', timeWindow: null },
      { date: '1988-11-02', time: null, timePrecision: 'unknown', timeWindow: null },
      { date: '2001-07-29', time: '03:10', timePrecision: 'exact', timeWindow: null },
      { date: '1975-01-09', time: null, timePrecision: 'approx', timeWindow: 'evening' },
    ];
    const seen = new Set<string>();
    for (const birth of births) {
      const chart = await (await call(postCharts, 'POST', { placeId: 6077243, ...birth })).json();
      const payload = ChartPayloadSchema.parse((await sql.query<{ payload: unknown }>('select payload from public.charts where id = $1', [chart.chartId])).rows[0]?.payload);
      const rows = (await sql.query<{ key: string; body: unknown }>(`select key, body from public.interpretation_kb where locale = 'fr'`)).rows;
      const kb = new Map(rows.map((r) => [r.key, KbEntrySchema.parse(r.body)]));
      for (const mode of TONE_MODES) {
        const response = await call(postRoasts, 'POST', { chartId: chart.chartId, mode });
        expect(response.status).toBe(201);
        const roast = RoastResponseSchema.parse(await response.json());
        expect(roast.status).toBe('fallback');
        expect(roast.punchlines.every((p) => p.label.length > 0 && p.text.length >= 40)).toBe(true);
        // Le repli passe lui-même la chaîne de validation complète, ancres et accroches comprises.
        const ctx = { chart: payload, mode, locale: 'fr' as const, gender: 'n' as const, kb: (key: string) => kb.get(key) ?? null };
        const stored = (await sql.query<{ content: unknown }>('select content from public.readings where id = $1', [roast.readingId])).rows[0]?.content;
        const checked = validateRoast(stored, ctx, buildRoastSheet(ctx).sheet);
        expect(checked.ok ? [] : checked.error).toEqual([]);
        for (const p of roast.punchlines) seen.add(p.text);
      }
    }
    // Des thèmes différents donnent des lectures différentes.
    expect(seen.size).toBeGreaterThan(20);
  });
});

describe('mise en place d’une base', async () => {
  const { runSetupStep } = await import('./setup');
  const { readFileSync, readdirSync } = await import('node:fs');
  const { gzipSync } = await import('node:zlib');
  const root = new URL('../../../../', import.meta.url);
  const migrationsDir = new URL('supabase/migrations/', root);
  const files = {
    migrations: readdirSync(migrationsDir).sort().map((f) => [f, readFileSync(new URL(f, migrationsDir), 'utf8')] as const),
    kb: { fr: JSON.parse(readFileSync(new URL('content/kb/fr/asc_sign.json', root), 'utf8')) as Record<string, unknown> },
    kbVersion: 'test',
    questions: { fr: JSON.parse(readFileSync(new URL('content/questions/fr.json', root), 'utf8')) as Record<string, string[]> },
    geoGz: gzipSync(['900001\tTestville\tTestville\tVille-Test\t\\N\tRégion\tFR\t48.1\t2.2\t1234\tEurope/Paris\tville test | testville', '900002\tAutre\tAutre\t\\N\t\\N\t\\N\tBE\t50.1\t4.2\t99\tEurope/Brussels\tautre'].join('\n')),
  };
  it('répond au contrôle de connexion et décrit l’état', async () => {
    expect(await runSetupStep(sql, 'ping', files)).toMatchObject({ ok: true });
    const status = await runSetupStep(sql, 'status', files);
    expect(status.tables).toBe(status.tablesWithRls);
  });
  it('n’applique une migration qu’une fois', async () => {
    // La base de test a déjà reçu les migrations par un autre chemin : on les déclare appliquées, puis on vérifie l'idempotence.
    await sql.query('create table if not exists public.app_migrations (name text primary key, applied_at timestamptz not null default now())');
    for (const [name] of files.migrations) await sql.query('insert into public.app_migrations (name) values ($1) on conflict do nothing', [name]);
    const result = await runSetupStep(sql, 'migrations', { ...files, migrations: [...files.migrations, ['99999999999999_essai.sql', 'create table public.essai_setup (id int primary key); alter table public.essai_setup enable row level security;']] });
    expect(result.applied).toEqual(['99999999999999_essai.sql']);
    expect((await runSetupStep(sql, 'migrations', files)).applied).toEqual([]);
    await sql.query('drop table public.essai_setup');
  });
  it('charge fiches, questions et lieux, et peut être rejouée', async () => {
    for (let pass = 0; pass < 2; pass += 1) {
      expect(await runSetupStep(sql, 'kb', files)).toEqual({ written: 12 });
      expect(await runSetupStep(sql, 'questions', files)).toEqual({ written: 120 });
      expect(await runSetupStep(sql, 'geo', files)).toEqual({ written: 2 });
    }
    const place = (await sql.query<{ name_fr: string; name_en: string | null; population: number }>('select name_fr, name_en, population from public.geo_places where geoname_id = 900001')).rows[0];
    expect(place).toEqual({ name_fr: 'Ville-Test', name_en: null, population: 1234 });
    expect(Number((await sql.query<{ n: string }>(`select count(*) as n from public.interpretation_kb where kb_version = 'test'`)).rows[0]?.n)).toBe(12);
    await sql.query(`delete from public.interpretation_kb where kb_version = 'test'`);
    await sql.query('delete from public.geo_places where geoname_id in (900001, 900002)');
  });
});
