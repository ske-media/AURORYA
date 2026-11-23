import { RoleCatalogSchema } from '@aurorya/ai';
import { DEFAULT_ENGINE_CONFIG } from '@aurorya/astro-engine';
import rolesJson from '../../../../content/roles/roles.v1.json';
import { afterAll, beforeAll, beforeEach, describe, expect, inject, it } from 'vitest';
import type { AppDeps, AuthPort } from './deps';
import { createLogger } from './log';
import { createNameFilter } from './names';
import { createPgSql } from './pg-sql';
import { invalidateConfigCache } from './remote-config';
import { postCharts } from './routes/charts';
import { deleteGroup, deleteGroupMember, deleteInvite, getInvite, patchGroup, postGroupInvites, postGroupLeave, postGroups, postGroupsJoin, postInvitesResolve } from './routes/groups';
import { postGroupReadings } from './routes/group-readings';
import { putProfile } from './routes/profile';
import { GroupReadingSchema } from '@aurorya/shared';

const roleCatalog = RoleCatalogSchema.parse(rolesJson);
const pg = inject('pg');
const { sql, close } = createPgSql({ host: pg.host, port: pg.port, user: 'postgres', database: 'postgres' });
const id = (n: number): string => `00000000-0000-4000-8000-0000000000b${n}`;
// owner et amie ont un compte ; anonyme et les invitées de remplissage sont des sessions anonymes.
const USERS: Record<string, { uid: string; isAnonymous: boolean }> = {
  owner: { uid: id(1), isAnonymous: false }, amie: { uid: id(2), isAnonymous: false }, anonyme: { uid: id(3), isAnonymous: true }, sansTheme: { uid: id(4), isAnonymous: false },
  ...Object.fromEntries(Array.from({ length: 7 }, (_, i) => [`x${i}`, { uid: `00000000-0000-4000-8000-0000000000c${i}`, isAnonymous: true }])),
};
const auth: AuthPort = { verify: async (token) => USERS[token] ?? null };
const clock = new Date('2026-11-23T10:00:00Z');
let now = clock;
const deps = (): AppDeps => ({
  sql, auth, logger: createLogger(() => undefined), now: () => now, llm: null, prompts: {} as AppDeps['prompts'],
  engineConfig: DEFAULT_ENGINE_CONFIG, roleCatalog, publicSiteUrl: 'https://exemple.invalid', nameFilter: createNameFilter(['salope']),
});
type Route = (r: Request, d: AppDeps, p?: Record<string, string>) => Promise<Response>;
const call = (route: Route, method: string, token: string | null, body?: unknown, params: Record<string, string> = {}) =>
  route(new Request('https://test.invalid/x', { method, body: body === undefined ? null : JSON.stringify(body), headers: token ? { authorization: `Bearer ${token}` } : {} }), deps(), params);
const consent = { consentGroupShare: true, consentVersion: '1' };
const count = async (query: string, params: unknown[] = []): Promise<number> => Number((await sql.query<{ n: string }>(query, params)).rows[0]?.n);

beforeAll(async () => {
  await sql.query(`insert into public.geo_places (geoname_id, name, ascii_name, country_code, latitude, longitude, population, tz_iana, search_text)
    values (2988507, 'Paris', 'Paris', 'FR', 48.85341, 2.3488, 2138551, 'Europe/Paris', 'paris') on conflict do nothing`);
  for (const [name, user] of Object.entries(USERS)) {
    await sql.query('insert into auth.users (id, is_anonymous) values ($1, $2)', [user.uid, user.isAnonymous]);
    await call(putProfile, 'PUT', name, { firstName: name === 'owner' ? 'Léa' : name === 'amie' ? 'Inès' : 'Camille', grammaticalGender: 'f' });
    if (name !== 'sansTheme') await call(postCharts, 'POST', name, { placeId: 2988507, date: '1990-06-15', time: '08:30', timePrecision: 'exact', timeWindow: null });
  }
});
afterAll(close);
beforeEach(async () => {
  now = clock;
  await sql.query('truncate public.rate_limits');
  invalidateConfigCache(sql);
});

describe('groupes', () => {
  let groupId = '';
  let invite = { inviteId: '', token: '', code: '', url: '' };

  it('exige un compte, un thème et un nom acceptable pour créer un groupe', async () => {
    expect((await (await call(postGroups, 'POST', 'anonyme', { name: 'Les copines', type: 'friends' })).json()).error.code).toBe('ACCOUNT_REQUIRED');
    expect((await (await call(postGroups, 'POST', 'sansTheme', { name: 'Les copines', type: 'friends' })).json()).error.code).toBe('CONFLICT');
    expect((await (await call(postGroups, 'POST', 'owner', { name: 'Les salopes', type: 'friends' })).json()).error.code).toBe('NAME_REJECTED');
    expect((await call(postGroups, 'POST', null, { name: 'Les copines', type: 'friends' })).status).toBe(401);
  });

  it('crée le groupe et fait de la créatrice sa première membre', async () => {
    const response = await call(postGroups, 'POST', 'owner', { name: ' Les copines ', type: 'friends' });
    expect(response.status).toBe(201);
    const group = await response.json();
    expect(group).toMatchObject({ name: 'Les copines', type: 'friends', ownerId: USERS.owner?.uid, membersCount: 1 });
    groupId = group.id;
    const member = (await sql.query<{ display_name: string; sun_sign: string }>('select display_name, sun_sign from public.group_members where group_id = $1', [groupId])).rows[0];
    expect(member).toEqual({ display_name: 'Léa', sun_sign: 'gemini' });
  });

  it('applique le quota de groupes gratuits', async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 3; i += 1) statuses.push((await call(postGroups, 'POST', 'owner', { name: `Groupe ${'abc'[i]}`, type: 'family' })).status);
    expect(statuses).toEqual([201, 201, 429]);
  });

  it('crée une invitation dont seule l’empreinte du jeton est conservée', async () => {
    expect((await call(postGroupInvites, 'POST', 'amie', undefined, { id: groupId })).status).toBe(404);
    const response = await call(postGroupInvites, 'POST', 'owner', undefined, { id: groupId });
    expect(response.status).toBe(201);
    invite = await response.json();
    expect(invite.url).toBe(`https://exemple.invalid/g/${invite.token}`);
    expect(invite.code).toMatch(/^[A-HJ-KM-NP-Z2-9]{8}$/);
    const stored = (await sql.query<{ token_hash: string }>('select token_hash from public.group_invites where id = $1', [invite.inviteId])).rows[0];
    expect(stored?.token_hash).not.toBe(invite.token);
    expect(await count(`select count(*) as n from public.group_invites where token_hash = $1 or code = $1`, [invite.token])).toBe(0);
  });

  it('donne un aperçu public minimal, par lien comme par code', async () => {
    const byToken = await (await call(getInvite, 'GET', null, undefined, { token: invite.token })).json();
    expect(byToken).toEqual({ inviterFirstName: 'Léa', groupName: 'Les copines', groupType: 'friends', valid: true });
    const byCode = await (await call(postInvitesResolve, 'POST', 'amie', { code: invite.code.toLowerCase() })).json();
    expect(byCode).toEqual(byToken);
    expect((await call(getInvite, 'GET', null, undefined, { token: 'inconnu' })).status).toBe(410);
    expect((await call(postInvitesResolve, 'POST', 'amie', { code: 'ZZZZZZZZ' })).status).toBe(410);
  });

  it('exige le consentement explicite et un thème pour rejoindre', async () => {
    expect((await call(postGroupsJoin, 'POST', 'amie', { token: invite.token, displayName: 'Inès' })).status).toBe(400);
    expect((await call(postGroupsJoin, 'POST', 'amie', { token: invite.token, displayName: 'Inès', consentGroupShare: false, consentVersion: '1' })).status).toBe(400);
    expect((await (await call(postGroupsJoin, 'POST', 'sansTheme', { token: invite.token, displayName: 'Zoé', ...consent })).json()).error.code).toBe('CONFLICT');
    expect((await (await call(postGroupsJoin, 'POST', 'amie', { token: invite.token, displayName: 'Salope', ...consent })).json()).error.code).toBe('NAME_REJECTED');
  });

  it('fait entrer une invitée, enregistre son consentement et rend caduques les lectures', async () => {
    await sql.query(`insert into public.group_readings (group_id, kind, members_hash, mode, locale, content, prompt_version, kb_version, model) values ($1, 'roles_duos', 'h', 'cash', 'fr', '{}', 'p', '1', 'm')`, [groupId]);
    const joined = await call(postGroupsJoin, 'POST', 'amie', { token: invite.token, displayName: 'Inès', ...consent });
    expect(joined.status).toBe(201);
    expect((await joined.json()).membersCount).toBe(2);
    expect(await count(`select count(*) as n from public.consents where user_id = $1 and kind = 'group_share' and granted and context ->> 'group_id' = $2`, [USERS.amie?.uid, groupId])).toBe(1);
    expect(await count('select count(*) as n from public.group_readings where group_id = $1', [groupId])).toBe(0);
    expect(await count('select uses as n from public.group_invites where id = $1', [invite.inviteId])).toBe(1);
    const again = await (await call(postGroupsJoin, 'POST', 'amie', { code: invite.code, displayName: 'Inès', ...consent })).json();
    expect(again.error).toMatchObject({ code: 'CONFLICT', details: { reason: 'already_member' } });
  });

  it('accepte une session anonyme, par code, jusqu’à huit membres', async () => {
    expect((await call(postGroupsJoin, 'POST', 'anonyme', { code: invite.code, displayName: 'Camille', ...consent })).status).toBe(201);
    for (let i = 0; i < 5; i += 1) expect((await call(postGroupsJoin, 'POST', `x${i}`, { code: invite.code, displayName: 'Camille', ...consent })).status).toBe(201);
    expect(await count('select count(*) as n from public.group_members where group_id = $1', [groupId])).toBe(8);
    const full = await (await call(postGroupsJoin, 'POST', 'x5', { code: invite.code, displayName: 'Camille', ...consent })).json();
    expect(full.error).toMatchObject({ code: 'CONFLICT', details: { reason: 'group_full' } });
    expect((await (await call(getInvite, 'GET', null, undefined, { token: invite.token })).json()).valid).toBe(false);
    expect((await call(postGroupInvites, 'POST', 'owner', undefined, { id: groupId })).status).toBe(409);
  });

  it('attribue un rôle différent à chaque membre et choisit deux duos, sans jamais exposer de score', async () => {
    const response = await call(postGroupReadings, 'POST', 'amie', { kind: 'roles_duos', mode: 'cash' }, { id: groupId });
    expect(response.status).toBe(200);
    const text = await response.text();
    const reading = GroupReadingSchema.parse(JSON.parse(text));
    expect(reading.roles).toHaveLength(8);
    expect(new Set(reading.roles.map((r) => r.roleId)).size).toBe(8);
    expect(reading.roles.every((r) => r.label.length > 0 && r.locked)).toBe(true);
    expect(reading.duos.map((d) => d.kind)).toEqual(['duo_fusion', 'duo_sparks']);
    expect(text).not.toMatch(/harmony|tension|payload|longitude/);
    const again = await (await call(postGroupReadings, 'POST', 'owner', { kind: 'roles_duos', mode: 'soft' }, { id: groupId })).json();
    expect(again.roles.map((r: { roleId: string }) => r.roleId)).toEqual(reading.roles.map((r) => r.roleId));
  });

  it('refuse la lecture à une non-membre et réserve la météo au Premium', async () => {
    expect((await call(postGroupReadings, 'POST', 'x6', { kind: 'roles_duos', mode: 'cash' }, { id: groupId })).status).toBe(404);
    expect((await (await call(postGroupReadings, 'POST', 'amie', { kind: 'weekly_weather', mode: 'cash' }, { id: groupId })).json()).error.code).toBe('PREMIUM_REQUIRED');
  });

  it('réserve le renommage, le retrait et la suppression à la propriétaire', async () => {
    expect((await call(patchGroup, 'PATCH', 'amie', { name: 'Autre nom' }, { id: groupId })).status).toBe(403);
    expect((await call(deleteGroup, 'DELETE', 'amie', undefined, { id: groupId })).status).toBe(403);
    expect((await call(deleteGroupMember, 'DELETE', 'amie', undefined, { id: groupId, userId: USERS.anonyme?.uid ?? '' })).status).toBe(403);
    expect((await call(patchGroup, 'PATCH', 'x6', { name: 'Autre nom' }, { id: groupId })).status).toBe(404);
    expect((await (await call(patchGroup, 'PATCH', 'owner', { name: 'Les copines du jeudi' }, { id: groupId })).json()).name).toBe('Les copines du jeudi');
    expect((await call(deleteGroupMember, 'DELETE', 'owner', undefined, { id: groupId, userId: USERS.x4?.uid ?? '' })).status).toBe(204);
    expect((await call(deleteGroupMember, 'DELETE', 'owner', undefined, { id: groupId, userId: 'pas-un-uuid' })).status).toBe(404);
    expect(await count('select count(*) as n from public.group_members where group_id = $1', [groupId])).toBe(7);
  });

  it('refuse une invitation révoquée ou expirée', async () => {
    const fresh = await (await call(postGroupInvites, 'POST', 'owner', undefined, { id: groupId })).json();
    now = new Date(clock.getTime() + 15 * 86_400_000);
    expect((await call(postGroupsJoin, 'POST', 'x4', { token: fresh.token, displayName: 'Camille', ...consent })).status).toBe(410);
    now = clock;
    expect((await call(deleteInvite, 'DELETE', 'amie', undefined, { id: fresh.inviteId })).status).toBe(204);
    expect((await call(postGroupsJoin, 'POST', 'x4', { token: fresh.token, displayName: 'Camille', ...consent })).status).toBe(410);
  });

  it('transmet le groupe à la plus ancienne membre non anonyme quand la propriétaire part', async () => {
    expect((await call(postGroupLeave, 'POST', 'owner', undefined, { id: groupId })).status).toBe(204);
    expect((await sql.query<{ owner_id: string }>('select owner_id from public.groups where id = $1', [groupId])).rows[0]?.owner_id).toBe(USERS.amie?.uid);
    expect((await call(postGroupLeave, 'POST', 'owner', undefined, { id: groupId })).status).toBe(404);
  });

  it('supprime le groupe quand il ne reste aucune membre avec un compte', async () => {
    expect((await call(postGroupLeave, 'POST', 'amie', undefined, { id: groupId })).status).toBe(204);
    expect(await count('select count(*) as n from public.groups where id = $1', [groupId])).toBe(0);
    expect(await count('select count(*) as n from public.group_members where group_id = $1', [groupId])).toBe(0);
  });
});
