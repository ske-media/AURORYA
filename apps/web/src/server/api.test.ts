// Tests de contrat de l'API contre un vrai Postgres (migrations appliquées) : entrée invalide,
// non authentifié, sans droit, cas nominal (SPEC §22.2).
import type { LlmPort, RoastPrompts } from '@aurorya/ai';
import { RoleCatalogSchema } from '@aurorya/ai';
import { DEFAULT_ENGINE_CONFIG } from '@aurorya/astro-engine';
import rolesJson from '../../../../content/roles/roles.v1.json';
import { ChartSummariesSchema, ChartSummarySchema, DailyResponseSchema, type KbEntry, type RoastOutput, RoastResponseSchema, SECTION_KEYS, SectionResponseSchema, err, ok } from '@aurorya/shared';
import { afterAll, beforeAll, beforeEach, describe, expect, inject, it } from 'vitest';
import type { AppDeps, AuthPort } from './deps';
import { createLogger } from './log';
import { createNameFilter } from './names';
import { createPgSql } from './pg-sql';
import { invalidateConfigCache } from './remote-config';
import { ageOn, postCharts } from './routes/charts';
import { getConfig, putProfile } from './routes/profile';
import { getDaily } from './routes/daily';
import { getSection } from './routes/readings';
import { getChartSummaries } from './routes/summaries';
import { postRoasts, roastSheetFor } from './routes/roasts';

const roleCatalog = RoleCatalogSchema.parse(rolesJson);
const pg = inject('pg');
const { sql, close } = createPgSql({ host: pg.host, port: pg.port, user: 'postgres', database: 'postgres' });
const USERS = { lea: '00000000-0000-4000-8000-0000000000a1', ines: '00000000-0000-4000-8000-0000000000a2' };
const auth: AuthPort = { verify: async (token) => (token in USERS ? { uid: USERS[token as keyof typeof USERS], isAnonymous: true } : null) };
const logs: string[] = [];
let clock = new Date('2026-11-23T10:00:00Z');
let llm: LlmPort | null = null;
const prompt = (id: string): RoastPrompts => ({ system: id, judgeSystem: 'juge', promptVersion: `v-${id}` });
const prompts = { fr: { soft: prompt('fr-soft'), cash: prompt('fr-cash'), expert: prompt('fr-expert') }, en: { soft: prompt('en-soft'), cash: prompt('en-cash'), expert: prompt('en-expert') } };
const deps = (): AppDeps => ({
  sql, auth, logger: createLogger((line) => logs.push(line)), now: () => clock, llm, prompts,
  engineConfig: DEFAULT_ENGINE_CONFIG, roleCatalog, deleteAuthUser: async (uid) => void (await sql.query('delete from auth.users where id = $1', [uid])), publicSiteUrl: null, nameFilter: createNameFilter(['salope']),
});

const call = (route: (r: Request, d: AppDeps) => Promise<Response>, method: string, body: unknown, token: string | null = 'lea', headers: Record<string, string> = {}) =>
  route(new Request('https://test.invalid/api/v1/x', {
    method, body: body === undefined ? null : JSON.stringify(body),
    headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), 'x-app-build': '1', ...headers },
  }), deps());
const birth = { placeId: 2996944, date: '1993-04-17', time: '14:35', timePrecision: 'exact', timeWindow: null };
const profile = { firstName: ' léa ', grammaticalGender: 'f' };
const kbEntry: KbEntry = {
  keywords: ['a', 'b', 'c'], essence: 'Une manière entière de vivre les choses.', light: ['élan', 'franchise'], shadow: ['impatience', 'excès'],
  behaviors: ['répond vite', 'range tard', 'note tout'], summary: { soft: 'Doux.', cash: 'Franc.', expert: 'Précis.' },
  roastAngles: { soft: ['Une douceur qui prend son temps avant de se dire tout haut.'], cash: ['Tu dis que tout va bien avec le dossier complet déjà archivé.'], expert: ['Une logique intérieure exigeante structure la manière de réagir.'] },
  roastWeight: 1, avoid: [],
};

beforeAll(async () => {
  // Les fichiers de test partagent une base : on repart d'une base de règles vide et de la configuration initiale.
  await sql.query('delete from public.interpretation_kb');
  await sql.query(`update public.remote_config set value = '3' where key = 'quota.birth_edits_per_30d'`);
  await sql.query(`update public.remote_config set value = '10' where key = 'limits.charts_per_hour'`);
  await sql.query(`update public.remote_config set value = '20' where key = 'limits.roasts_per_hour'`);
  await sql.query('insert into auth.users (id, is_anonymous) values ($1, true), ($2, true)', [USERS.lea, USERS.ines]);
  await sql.query(`insert into public.geo_places (geoname_id, name, ascii_name, name_fr, admin1_name, country_code, latitude, longitude, population, tz_iana, search_text)
    values (2996944, 'Lyon', 'Lyon', 'Lyon', 'Auvergne-Rhône-Alpes', 'FR', 45.74846, 4.84671, 472317, 'Europe/Paris', 'lyon')`);
});
afterAll(close);
beforeEach(async () => {
  logs.length = 0;
  llm = null;
  clock = new Date('2026-11-23T10:00:00Z');
  await sql.query('truncate public.rate_limits');
  invalidateConfigCache(sql);
});

describe('socle', () => {
  it('refuse une requête sans jeton ou avec un jeton invalide', async () => {
    for (const token of [null, 'inconnue']) {
      const response = await call(putProfile, 'PUT', profile, token);
      expect(response.status).toBe(401);
      expect((await response.json()).error.code).toBe('UNAUTHENTICATED');
    }
  });
  it('renvoie les champs fautifs d’une entrée invalide, sans leurs valeurs', async () => {
    const response = await call(putProfile, 'PUT', { firstName: 'Léa', grammaticalGender: 'x', secret: 'valeur-sensible' });
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_FAILED');
    expect(JSON.stringify(body)).not.toContain('valeur-sensible');
    expect((await call(putProfile, 'PUT', undefined)).status).toBe(400);
  });
  it('impose la mise à jour à une app trop ancienne', async () => {
    await sql.query(`update public.remote_config set value = '5' where key = 'app.min_build'`);
    invalidateConfigCache(sql);
    const response = await call(putProfile, 'PUT', profile, 'lea', { 'x-app-build': '4' });
    expect(response.status).toBe(426);
    await sql.query(`update public.remote_config set value = '1' where key = 'app.min_build'`);
  });
  it('applique la limite de débit et annonce le délai', async () => {
    await sql.query(`update public.remote_config set value = '2' where key = 'limits.charts_per_hour'`);
    invalidateConfigCache(sql);
    const statuses: number[] = [];
    let last: Response | null = null;
    for (let i = 0; i < 3; i += 1) { last = await call(postCharts, 'POST', { ...birth, placeId: 1 }, 'ines'); statuses.push(last.status); }
    expect(statuses[2]).toBe(429);
    expect(last?.headers.get('retry-after')).toBe('3600');
    await sql.query(`update public.remote_config set value = '10' where key = 'limits.charts_per_hour'`);
  });
  it('journalise sans aucune donnée personnelle et renvoie l’identifiant de requête', async () => {
    const id = '11111111-2222-4333-8444-555555555555';
    const response = await call(putProfile, 'PUT', profile, 'lea', { 'x-request-id': id });
    expect(response.headers.get('x-request-id')).toBe(id);
    expect(logs.join('\n')).toContain(id);
    expect(logs.join('\n')).not.toMatch(/léa|Léa|1993|Lyon/);
  });
});

describe('PUT /profile et GET /config', () => {
  it('crée puis met à jour le profil, prénom normalisé', async () => {
    const created = await (await call(putProfile, 'PUT', profile)).json();
    expect(created).toMatchObject({ id: USERS.lea, firstName: 'Léa', grammaticalGender: 'f', locale: 'fr', toneModeDefault: 'cash' });
    const updated = await (await call(putProfile, 'PUT', { ...profile, toneModeDefault: 'soft', interests: ['love'] })).json();
    expect(updated).toMatchObject({ toneModeDefault: 'soft', interests: ['love'] });
    expect((await sql.query('select count(*) as n from public.profiles where id = $1', [USERS.lea])).rows[0]?.n).toBe('1');
  });
  it('refuse un prénom bloqué ou mal formé', async () => {
    for (const firstName of ['Salope', 'Léa2']) {
      const response = await call(putProfile, 'PUT', { ...profile, firstName });
      expect(response.status).toBe(422);
      expect((await response.json()).error.code).toBe('NAME_REJECTED');
    }
  });
  it('ne renvoie que la configuration publique, et un droit décidé par le serveur', async () => {
    const body = await (await call(getConfig, 'GET', undefined)).json();
    expect(body.config['policy.min_age']).toBe(16);
    expect(body.config).not.toHaveProperty('flags.ai_generation_enabled');
    expect(body.entitlement).toEqual({ premium: false });
    expect(body.foundersRemaining).toBe(500);
  });
});

describe('POST /charts', () => {
  it('calcule l’âge révolu', () => {
    expect(ageOn('2010-11-23', new Date('2026-11-23T00:00:00Z'))).toBe(16);
    expect(ageOn('2010-11-24', new Date('2026-11-23T00:00:00Z'))).toBe(15);
  });
  it('refuse en dessous de l’âge minimum, sans rien enregistrer', async () => {
    const response = await call(postCharts, 'POST', { ...birth, date: '2012-01-01' });
    expect(response.status).toBe(422);
    expect((await response.json()).error.code).toBe('AGE_RESTRICTED');
    expect((await sql.query('select count(*) as n from public.birth_data where user_id = $1', [USERS.lea])).rows[0]?.n).toBe('0');
  });
  it('refuse un lieu inconnu et une heure inexistante', async () => {
    expect((await call(postCharts, 'POST', { ...birth, placeId: 42 })).status).toBe(400);
    const gap = await call(postCharts, 'POST', { ...birth, date: '2000-03-26', time: '02:30' });
    expect((await gap.json()).error.code).toBe('BIRTH_TIME_NONEXISTENT');
  });
  it('enregistre le thème avec les coordonnées de la base, puis reste idempotent', async () => {
    const first = await call(postCharts, 'POST', birth);
    expect(first.status).toBe(201);
    const summary = ChartSummarySchema.parse(await first.json());
    expect(summary).toMatchObject({ sunSign: 'aries', ascSign: 'leo', flags: { timeAssumed: false } });
    const row = (await sql.query<{ latitude: number; tz_iana: string; place_label: string }>('select latitude, tz_iana, place_label from public.birth_data where user_id = $1', [USERS.lea])).rows[0];
    expect(row).toEqual({ latitude: 45.74846, tz_iana: 'Europe/Paris', place_label: 'Lyon, Auvergne-Rhône-Alpes' });
    const again = await call(postCharts, 'POST', birth);
    expect(again.status).toBe(200);
    expect((await again.json()).chartId).toBe(summary.chartId);
    expect((await sql.query('select count(*) as n from public.charts where user_id = $1', [USERS.lea])).rows[0]?.n).toBe('1');
  });
  it('remplace le thème courant à chaque modification, dans la limite du quota', async () => {
    const statuses: number[] = [];
    for (const time of ['14:40', '14:45', '14:50', '14:55']) statuses.push((await call(postCharts, 'POST', { ...birth, time })).status);
    expect(statuses).toEqual([201, 201, 201, 429]);
    expect((await sql.query('select count(*) as n from public.charts where user_id = $1 and is_current', [USERS.lea])).rows[0]?.n).toBe('1');
    expect((await sql.query('select count(*) as n from public.birth_data where user_id = $1', [USERS.lea])).rows[0]?.n).toBe('1');
  });
  it('retrouve l’ancien thème quand on revient à des données déjà saisies, sans quota ni recalcul', async () => {
    // Le quota est atteint par le test précédent ; un retour en arrière reste possible.
    const before = (await sql.query<{ id: string }>('select id from public.charts where user_id = $1 order by computed_at limit 1', [USERS.lea])).rows[0];
    const response = await call(postCharts, 'POST', birth);
    expect(response.status).toBe(200);
    expect((await response.json()).chartId).toBe(before?.id);
    expect((await sql.query('select count(*) as n from public.charts where user_id = $1', [USERS.lea])).rows[0]?.n).toBe('4');
    const current = (await sql.query<{ id: string; time: string }>('select c.id, b.birth_time::text as time from public.charts c join public.birth_data b on b.user_id = c.user_id where c.user_id = $1 and c.is_current', [USERS.lea])).rows[0];
    expect(current).toEqual({ id: before?.id, time: '14:35:00' });
  });

  it('sans heure : ni Ascendant, ni heure supposée présentée comme réelle', async () => {
    await call(putProfile, 'PUT', { firstName: 'Inès', grammaticalGender: 'n' }, 'ines');
    const summary = await (await call(postCharts, 'POST', { ...birth, time: null, timePrecision: 'unknown' }, 'ines')).json();
    expect(summary).toMatchObject({ ascSign: null, flags: { timeAssumed: true } });
  });
});

describe('POST /roasts', () => {
  const chartOf = async (uid: string) => (await sql.query<{ id: string; payload: never }>('select id, payload from public.charts where user_id = $1 and is_current', [uid])).rows[0];
  // `kb` doit refléter la base de règles présente en base au moment de l'appel : elle pèse dans le choix des faits.
  const goodOutput = async (uid: string, kb: (key: string) => KbEntry | null = () => null): Promise<RoastOutput> => {
    const chart = await chartOf(uid);
    const { sheet } = roastSheetFor({ chart: chart?.payload as never, mode: 'cash', locale: 'fr', gender: 'f', kb });
    const anchors = sheet.map((s) => s.fact.factId);
    return {
      punchlines: [
        { anchor: anchors[0] ?? '', text: 'Tu dis que tout va bien avec le dossier complet déjà archivé dans ta tête.' },
        { anchor: anchors[1] ?? '', text: 'Tu réponds avant la fin de la question, et tu as raison une fois sur deux.' },
        { anchor: anchors[2] ?? '', text: 'Tu promets de te reposer, puis tu ranges toute la maison à minuit.' },
      ],
      hooks: Object.fromEntries(SECTION_KEYS.map((k) => [k, 'Tu avances vite, puis tu doutes en silence. La suite dit pourquoi.'])) as RoastOutput['hooks'],
    };
  };
  const fake = (output: unknown): LlmPort & { calls: number } => {
    const port = {
      calls: 0,
      generateStructured: async (request: { tier: string; schema: { parse: (v: unknown) => unknown } }) => {
        port.calls += 1;
        if (request.tier === 'judge') return ok({ data: request.schema.parse({ bodyOrHealth: false, prediction: false, advice: false, demeaning: false, explicitOrHate: false }), usage: { tokensIn: 5, tokensOut: 5 }, model: 'faux-juge' });
        return output === null ? err({ code: 'PROVIDER_ERROR' as const }) : ok({ data: output, usage: { tokensIn: 100, tokensOut: 50 }, model: 'faux-modele' });
      },
    };
    return port as never;
  };

  it('refuse le thème d’une autre utilisatrice', async () => {
    const lea = await chartOf(USERS.lea);
    const response = await call(postRoasts, 'POST', { chartId: lea?.id, mode: 'cash' }, 'ines');
    expect(response.status).toBe(404);
  });
  it('sans base de règles ni LLM : indisponible, sans erreur technique', async () => {
    const lea = await chartOf(USERS.lea);
    const response = await call(postRoasts, 'POST', { chartId: lea?.id, mode: 'cash' });
    expect(response.status).toBe(503);
    expect((await response.json()).error.code).toBe('GENERATION_UNAVAILABLE');
  });
  it('génère, enregistre, puis sert le cache sans rappeler le LLM', async () => {
    const lea = await chartOf(USERS.lea);
    llm = fake(await goodOutput(USERS.lea));
    const first = await call(postRoasts, 'POST', { chartId: lea?.id, mode: 'cash' });
    expect(first.status).toBe(201);
    const roast = RoastResponseSchema.parse(await first.json());
    expect(roast.status).toBe('ok');
    expect(roast.punchlines.every((p) => p.label.length > 0)).toBe(true);
    const calls = (llm as LlmPort & { calls: number }).calls;
    const second = await call(postRoasts, 'POST', { chartId: lea?.id, mode: 'cash' });
    expect(second.status).toBe(200);
    expect((await second.json()).readingId).toBe(roast.readingId);
    expect((llm as LlmPort & { calls: number }).calls).toBe(calls);
    const usage = (await sql.query<{ feature: string; outcome: string }>('select feature, outcome from public.ai_usage where user_id = $1 order by id', [USERS.lea])).rows;
    expect(usage).toEqual([{ feature: 'roast', outcome: 'ok' }, { feature: 'judge', outcome: 'ok' }]);
  });
  it('réserve la régénération au Premium, dans la limite du quota', async () => {
    const lea = await chartOf(USERS.lea);
    llm = fake(await goodOutput(USERS.lea));
    const refused = await call(postRoasts, 'POST', { chartId: lea?.id, mode: 'cash', regenerate: true });
    expect((await refused.json()).error.code).toBe('PREMIUM_REQUIRED');
    await sql.query('insert into public.entitlements (user_id, is_premium, expires_at, rc_event_at) values ($1, true, $2, now())', [USERS.lea, new Date('2027-01-01')]);
    const variants: number[] = [];
    for (let i = 0; i < 3; i += 1) variants.push((await (await call(postRoasts, 'POST', { chartId: lea?.id, mode: 'cash', regenerate: true })).json()).variant);
    expect(variants).toEqual([1, 2, 3]);
    const over = await call(postRoasts, 'POST', { chartId: lea?.id, mode: 'cash', regenerate: true });
    expect((await over.json()).error.code).toBe('QUOTA_EXCEEDED');
    // Un droit expiré ne vaut plus rien.
    clock = new Date('2027-02-01T10:00:00Z');
    expect((await (await call(postRoasts, 'POST', { chartId: lea?.id, mode: 'cash', regenerate: true })).json()).error.code).toBe('PREMIUM_REQUIRED');
  });
  it('sert le repli de la base de règles quand le LLM échoue, puis retente après dix minutes', async () => {
    const lea = await chartOf(USERS.lea);
    const keys = (await sql.query<{ payload: { bodies: { id: string; sign: string }[] } }>('select payload from public.charts where id = $1', [lea?.id])).rows[0]?.payload.bodies ?? [];
    for (const b of keys) await sql.query(`insert into public.interpretation_kb (key, locale, kb_version, body) values ($1, 'fr', '1', $2) on conflict do nothing`, [`planet_sign:${b.id}:${b.sign}`, JSON.stringify({ ...kbEntry, roastAngles: { ...kbEntry.roastAngles, soft: [`Une douceur qui prend son temps, version ${b.id} du dossier complet.`] } })]);
    llm = fake(null);
    const fallback = await (await call(postRoasts, 'POST', { chartId: lea?.id, mode: 'soft' })).json();
    expect(fallback.status).toBe('fallback');
    llm = fake(await goodOutput(USERS.lea, (key) => (key.startsWith('planet_sign:') ? kbEntry : null)));
    expect((await (await call(postRoasts, 'POST', { chartId: lea?.id, mode: 'soft' })).json()).status).toBe('fallback');
    clock = new Date(clock.getTime() + 11 * 60_000);
    const retried = await (await call(postRoasts, 'POST', { chartId: lea?.id, mode: 'soft' })).json();
    expect(retried.status).toBe('ok');
    expect((await sql.query(`select count(*) as n from public.readings where chart_id = $1 and mode = 'soft'`, [lea?.id])).rows[0]?.n).toBe('1');
  });
});

describe('GET /readings/sections/{key}', () => {
  const section = (key: string, mode: string | null, token: string | null = 'lea') =>
    getSection(new Request(`https://test.invalid/api/v1/readings/sections/${key}${mode ? `?mode=${mode}` : ''}`, {
      headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), 'x-app-build': '1' },
    }), deps(), { key });
  const sections = async () => Number((await sql.query<{ n: string }>(`select count(*) as n from public.readings where user_id = $1 and kind = 'full_section'`, [USERS.lea])).rows[0]?.n);

  it('refuse sans jeton, sans mode, avec une section inconnue', async () => {
    expect((await section('love', 'cash', null)).status).toBe(401);
    expect((await section('love', null)).status).toBe(400);
    expect((await section('argent', 'cash')).status).toBe(400);
  });
  it('sans roast dans ce mode : introuvable', async () => {
    expect((await section('love', 'expert')).status).toBe(404);
  });
  it('sans droit : l’accroche seule, rien d’écrit ni de transmis', async () => {
    clock = new Date('2027-02-01T10:00:00Z'); // le droit de Léa a expiré
    const response = await section('love', 'cash');
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(SectionResponseSchema.parse(body)).toMatchObject({ key: 'love', mode: 'cash', locked: true });
    expect(Object.keys(body).sort()).toEqual(['hook', 'key', 'locked', 'mode']);
    expect(body.hook.length).toBeGreaterThan(0);
    expect(await sections()).toBe(0);
  });
  it('avec le droit : écrit une fois, puis sert le cache', async () => {
    const first = await section('love', 'cash');
    expect(first.status).toBe(201);
    const body = SectionResponseSchema.parse(await first.json());
    if (body.locked) throw new Error('section verrouillée');
    expect(body.paragraphs.length).toBeGreaterThanOrEqual(2);
    expect(body.anchors.length).toBeGreaterThan(0);
    expect(body.anchors.every((a) => a.label.length > 0)).toBe(true);
    clock = new Date(clock.getTime() + 3_600_000);
    const second = await section('love', 'cash');
    expect(second.status).toBe(200);
    expect(await second.json()).toEqual(body);
    expect(await sections()).toBe(1);
  });
  it('un repli de roast n’est pas recalculé tant qu’aucun LLM n’est disponible', async () => {
    const lea = (await sql.query<{ id: string }>('select id from public.charts where user_id = $1 and is_current', [USERS.lea])).rows[0];
    // Le repli exige trois punchlines distinctes : une par fiche.
    await sql.query(`update public.interpretation_kb set body = jsonb_set(body, '{roastAngles,expert}', jsonb_build_array('Une logique exigeante, fiche ' || key || '.'))`);
    const first = await call(postRoasts, 'POST', { chartId: lea?.id, mode: 'expert' });
    expect(first.status).toBe(201);
    const roast = await first.json();
    expect(roast.status).toBe('fallback');
    clock = new Date(clock.getTime() + 11 * 60_000);
    const later = await call(postRoasts, 'POST', { chartId: lea?.id, mode: 'expert' });
    expect(later.status).toBe(200);
    expect((await later.json()).readingId).toBe(roast.readingId);
  });
});

describe('feuille de placement et page du jour', () => {
  const get = (route: (r: Request, d: AppDeps) => Promise<Response>, path: string, token: string | null = 'lea') =>
    route(new Request(`https://test.invalid/api/v1/${path}`, { headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), 'x-app-build': '1' } }), deps());

  it('donne le résumé de chaque placement dans le mode demandé, sans LLM', async () => {
    expect((await get(getChartSummaries, 'charts/current/summaries?mode=cash', null)).status).toBe(401);
    expect((await get(getChartSummaries, 'charts/current/summaries')).status).toBe(400);
    const body = ChartSummariesSchema.parse(await (await get(getChartSummaries, 'charts/current/summaries?mode=cash')).json());
    expect(body.summaries['placement:sun']).toBe('Franc.');
    expect(Object.keys(body.summaries).every((id) => id.startsWith('placement:') || id.startsWith('angle:'))).toBe(true);
    const soft = ChartSummariesSchema.parse(await (await get(getChartSummaries, 'charts/current/summaries?mode=soft')).json());
    expect(soft.summaries['placement:sun']).toBe('Doux.');
  });
  it('sert un horoscope de repli et, sans droit, le seul nom du transit du jour', async () => {
    clock = new Date('2027-02-01T10:00:00Z'); // droit expiré
    const body = DailyResponseSchema.parse(await (await get(getDaily, 'daily?date=2027-02-01&mode=cash')).json());
    expect(body.signHoroscope).toMatchObject({ status: 'fallback', body: 'Franc.' });
    expect(body.signHoroscope?.headline).toBe('A · b · c');
    expect(body.personal.locked).toBe(true);
    expect(Object.keys(body.personal).sort()).toEqual(['headline', 'locked']);
    if (body.personal.headline !== null) expect(body.personal.headline).toMatch(/ (ton|ta) /);
  });
  it('avec le droit, détaille les transits du jour', async () => {
    const body = DailyResponseSchema.parse(await (await get(getDaily, 'daily?date=2026-11-23&mode=expert')).json());
    if (body.personal.locked) throw new Error('horoscope personnel verrouillé');
    expect(body.personal.items.length).toBeLessThanOrEqual(3);
    for (const item of body.personal.items) { expect(item.label).toContain(' votre '); expect(item.text).toBe('Précis.'); }
    if (body.personal.items[0]) expect(body.personal.headline).toBe(body.personal.items[0].label);
  });
});
