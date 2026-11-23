// Groupes : création, invitation, adhésion, départ (SPEC §7.6, §13.4).
import { GROUP_MAX_MEMBERS, type Group, JoinGroupInputSchema, PatchGroupInputSchema, PostGroupsInputSchema, ResolveInviteInputSchema } from '@aurorya/shared';
import { z } from 'zod';
import type { AppDeps, Sql } from '../deps';
import { ApiFailure, defineRoute, isPremium } from '../http';
import { INVITE_TTL_DAYS, generateInviteCode, generateInviteToken, hashInviteToken, normalizeInviteCode } from '../invites';
import { configValue } from '../remote-config';

const DEFAULT_LIMIT = { configKey: 'limits.default_per_hour', fallback: 300, windowSeconds: 3600 } as const;
const JOIN_LIMIT = { configKey: 'limits.joins_per_hour', fallback: 10, windowSeconds: 3600 } as const;

async function requireGroupsEnabled(deps: AppDeps): Promise<void> {
  if (!(await configValue(deps.sql, deps.now(), 'flags.groups_enabled', z.boolean(), true))) throw new ApiFailure('FORBIDDEN', 'groupes désactivés');
}
type MemberRow = { user_id: string; joined_at: Date };
type GroupRow = { id: string; name: string; type: Group['type']; owner_id: string; members: string };
const toGroup = (r: GroupRow): Group => ({ id: r.id, name: r.name, type: r.type, ownerId: r.owner_id, membersCount: Number(r.members) });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const loadGroup = async (sql: Sql, id: string): Promise<GroupRow | undefined> =>
  !UUID.test(id) ? undefined : (await sql.query<GroupRow>('select g.id, g.name, g.type, g.owner_id, (select count(*) from public.group_members m where m.group_id = g.id) as members from public.groups g where g.id = $1', [id])).rows[0];
const isMember = async (sql: Sql, groupId: string, uid: string): Promise<boolean> =>
  (await sql.query('select 1 from public.group_members where group_id = $1 and user_id = $2', [groupId, uid])).rowCount > 0;
const currentChart = async (sql: Sql, uid: string) =>
  (await sql.query<{ id: string; sun_sign: string; moon_sign: string | null; asc_sign: string | null; first_name: string; grammatical_gender: string }>(
    `select c.id, c.sun_sign, c.moon_sign, c.asc_sign, p.first_name, p.grammatical_gender from public.charts c join public.profiles p on p.id = c.user_id where c.user_id = $1 and c.is_current`, [uid])).rows[0];
/** Toute modification de la composition d'un groupe rend ses lectures caduques. */
const invalidateReadings = (sql: Sql, groupId: string) => sql.query('delete from public.group_readings where group_id = $1', [groupId]);

export const postGroups = defineRoute({
  name: 'POST /groups', auth: 'required', input: PostGroupsInputSchema, rateLimit: DEFAULT_LIMIT,
  handler: async ({ deps, user, input }) => {
    await requireGroupsEnabled(deps);
    // Une propriétaire anonyme perdrait son groupe en changeant de téléphone.
    if (user.isAnonymous) throw new ApiFailure('ACCOUNT_REQUIRED', 'compte requis pour créer un groupe');
    const name = deps.nameFilter.groupName(input.name);
    if (name === null) throw new ApiFailure('NAME_REJECTED', 'nom de groupe refusé');
    const chart = await currentChart(deps.sql, user.uid);
    if (!chart) throw new ApiFailure('CONFLICT', 'thème requis avant de créer un groupe');
    const premium = await isPremium(deps, user.uid);
    const quota = await configValue(deps.sql, deps.now(), premium ? 'quota.groups_premium' : 'quota.groups_free', z.number().int(), premium ? 20 : 3);
    const mine = Number((await deps.sql.query<{ n: string }>('select count(*) as n from public.group_members where user_id = $1', [user.uid])).rows[0]?.n ?? 0);
    if (mine >= quota) throw new ApiFailure('QUOTA_EXCEEDED', 'nombre maximal de groupes atteint');
    const id = await deps.sql.transaction(async (tx) => {
      const created = (await tx.query<{ id: string }>('insert into public.groups (owner_id, name, type) values ($1, $2, $3) returning id', [user.uid, name, input.type])).rows[0];
      if (!created) throw new Error('groupe non écrit');
      await tx.query(
        `insert into public.group_members (group_id, user_id, display_name, grammatical_gender, sun_sign, moon_sign, asc_sign, chart_id) values ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [created.id, user.uid, chart.first_name, chart.grammatical_gender, chart.sun_sign, chart.moon_sign, chart.asc_sign, chart.id]);
      return created.id;
    });
    const group = await loadGroup(deps.sql, id);
    if (!group) throw new Error('groupe introuvable après création');
    return { status: 201, body: toGroup(group) };
  },
});

export const patchGroup = defineRoute({
  name: 'PATCH /groups/{id}', auth: 'required', input: PatchGroupInputSchema, rateLimit: DEFAULT_LIMIT,
  handler: async ({ deps, user, input, params }) => {
    const group = await loadGroup(deps.sql, params.id ?? '');
    if (!group || !(await isMember(deps.sql, group.id, user.uid))) throw new ApiFailure('NOT_FOUND', 'groupe introuvable');
    if (group.owner_id !== user.uid) throw new ApiFailure('FORBIDDEN', 'réservé à la propriétaire');
    const name = deps.nameFilter.groupName(input.name);
    if (name === null) throw new ApiFailure('NAME_REJECTED', 'nom de groupe refusé');
    await deps.sql.query('update public.groups set name = $2, updated_at = $3 where id = $1', [group.id, name, deps.now()]);
    return { body: toGroup({ ...group, name }) };
  },
});

export const deleteGroup = defineRoute({
  name: 'DELETE /groups/{id}', auth: 'required', rateLimit: DEFAULT_LIMIT,
  handler: async ({ deps, user, params }) => {
    const group = await loadGroup(deps.sql, params.id ?? '');
    if (!group || !(await isMember(deps.sql, group.id, user.uid))) throw new ApiFailure('NOT_FOUND', 'groupe introuvable');
    if (group.owner_id !== user.uid) throw new ApiFailure('FORBIDDEN', 'réservé à la propriétaire');
    await deps.sql.query('delete from public.groups where id = $1', [group.id]);
    return { status: 204, body: null };
  },
});

export const postGroupInvites = defineRoute({
  name: 'POST /groups/{id}/invites', auth: 'required', rateLimit: DEFAULT_LIMIT,
  handler: async ({ deps, user, params }) => {
    await requireGroupsEnabled(deps);
    const group = await loadGroup(deps.sql, params.id ?? '');
    if (!group || !(await isMember(deps.sql, group.id, user.uid))) throw new ApiFailure('NOT_FOUND', 'groupe introuvable');
    if (Number(group.members) >= GROUP_MAX_MEMBERS) throw new ApiFailure('CONFLICT', 'groupe complet');
    const token = generateInviteToken();
    const expiresAt = new Date(deps.now().getTime() + INVITE_TTL_DAYS * 86_400_000);
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const code = generateInviteCode();
      const inserted = (await deps.sql.query<{ id: string }>(
        `insert into public.group_invites (group_id, created_by, token_hash, code, expires_at) values ($1, $2, $3, $4, $5) on conflict (code) do nothing returning id`,
        [group.id, user.uid, hashInviteToken(token), code, expiresAt])).rows[0];
      if (inserted) {
        return { status: 201, body: { inviteId: inserted.id, token, code, expiresAt: expiresAt.toISOString(), url: deps.publicSiteUrl ? `${deps.publicSiteUrl}/g/${token}` : null } };
      }
    }
    throw new Error('code d’invitation non attribué');
  },
});

export const deleteInvite = defineRoute({
  name: 'DELETE /invites/{id}', auth: 'required', rateLimit: DEFAULT_LIMIT,
  handler: async ({ deps, user, params }) => {
    const invite = UUID.test(params.id ?? '') ? (await deps.sql.query<{ group_id: string }>('select group_id from public.group_invites where id = $1', [params.id])).rows[0] : undefined;
    if (!invite || !(await isMember(deps.sql, invite.group_id, user.uid))) throw new ApiFailure('NOT_FOUND', 'invitation introuvable');
    await deps.sql.query('update public.group_invites set revoked_at = coalesce(revoked_at, $2) where id = $1', [params.id, deps.now()]);
    return { status: 204, body: null };
  },
});

type InviteRow = { id: string; group_id: string; expires_at: Date; revoked_at: Date | null; inviter: string; group_name: string; group_type: Group['type']; members: string };
const INVITE_SELECT = `select i.id, i.group_id, i.expires_at, i.revoked_at, p.first_name as inviter, g.name as group_name, g.type as group_type,
  (select count(*) from public.group_members m where m.group_id = g.id) as members
  from public.group_invites i join public.groups g on g.id = i.group_id join public.profiles p on p.id = i.created_by`;
const inviteValid = (invite: InviteRow, now: Date): boolean =>
  invite.revoked_at === null && new Date(invite.expires_at).getTime() > now.getTime() && Number(invite.members) < GROUP_MAX_MEMBERS;
/** Aperçu public d'une invitation : rien d'autre que le prénom de l'invitante, le nom et le type du groupe. */
const preview = (invite: InviteRow, now: Date) => ({ inviterFirstName: invite.inviter, groupName: invite.group_name, groupType: invite.group_type, valid: inviteValid(invite, now) });

export const getInvite = defineRoute({
  name: 'GET /invites/{token}', auth: 'none',
  rateLimit: { configKey: 'limits.invite_previews_per_hour_ip', fallback: 60, windowSeconds: 3600 },
  handler: async ({ deps, params }) => {
    const invite = (await deps.sql.query<InviteRow>(`${INVITE_SELECT} where i.token_hash = $1`, [hashInviteToken(params.token ?? '')])).rows[0];
    if (!invite) throw new ApiFailure('INVITE_INVALID', 'invitation inconnue');
    return { body: preview(invite, deps.now()) };
  },
});

export const postInvitesResolve = defineRoute({
  name: 'POST /invites/resolve', auth: 'required', input: ResolveInviteInputSchema, rateLimit: JOIN_LIMIT,
  handler: async ({ deps, input }) => {
    const code = normalizeInviteCode(input.code);
    const invite = code ? (await deps.sql.query<InviteRow>(`${INVITE_SELECT} where i.code = $1`, [code])).rows[0] : undefined;
    if (!invite) throw new ApiFailure('INVITE_INVALID', 'code inconnu');
    return { body: preview(invite, deps.now()) };
  },
});

export const postGroupsJoin = defineRoute({
  name: 'POST /groups/join', auth: 'required', input: JoinGroupInputSchema, rateLimit: JOIN_LIMIT,
  handler: async ({ deps, user, input }) => {
    await requireGroupsEnabled(deps);
    const displayName = deps.nameFilter.firstName(input.displayName);
    if (displayName === null) throw new ApiFailure('NAME_REJECTED', 'prénom refusé');
    const chart = await currentChart(deps.sql, user.uid);
    if (!chart) throw new ApiFailure('CONFLICT', 'thème requis avant de rejoindre un groupe');
    const code = input.code !== undefined ? normalizeInviteCode(input.code) : null;
    const group = await deps.sql.transaction(async (tx) => {
      const invite = input.token !== undefined
        ? (await tx.query<InviteRow>(`${INVITE_SELECT} where i.token_hash = $1 for update of i`, [hashInviteToken(input.token)])).rows[0]
        : code ? (await tx.query<InviteRow>(`${INVITE_SELECT} where i.code = $1 for update of i`, [code])).rows[0] : undefined;
      if (!invite || invite.revoked_at !== null || new Date(invite.expires_at).getTime() <= deps.now().getTime()) throw new ApiFailure('INVITE_INVALID', 'invitation expirée, révoquée ou inconnue');
      if (await isMember(tx, invite.group_id, user.uid)) throw new ApiFailure('CONFLICT', 'déjà membre', { reason: 'already_member' });
      if (Number(invite.members) >= GROUP_MAX_MEMBERS) throw new ApiFailure('CONFLICT', 'groupe complet', { reason: 'group_full' });
      await tx.query(
        `insert into public.group_members (group_id, user_id, display_name, grammatical_gender, sun_sign, moon_sign, asc_sign, chart_id, invited_by)
         select $1, $2, $3, $4, $5, $6, $7, $8, created_by from public.group_invites where id = $9`,
        [invite.group_id, user.uid, displayName, chart.grammatical_gender, chart.sun_sign, chart.moon_sign, chart.asc_sign, chart.id, invite.id]);
      await tx.query('update public.group_invites set uses = uses + 1 where id = $1', [invite.id]);
      await tx.query(`insert into public.consents (user_id, kind, granted, version, context) values ($1, 'group_share', true, $2, $3)`, [user.uid, input.consentVersion, JSON.stringify({ group_id: invite.group_id })]);
      await tx.query('update public.profiles set came_from_invite = true where id = $1 and onboarding_completed_at is null', [user.uid]);
      await invalidateReadings(tx, invite.group_id);
      return invite.group_id;
    });
    const loaded = await loadGroup(deps.sql, group);
    if (!loaded) throw new Error('groupe introuvable après adhésion');
    return { status: 201, body: toGroup(loaded) };
  },
});

/** Retire une membre. Si la propriétaire part, la plus ancienne membre non anonyme lui succède ; sinon le groupe est supprimé. */
async function removeMember(sql: Sql, groupId: string, uid: string, ownerId: string): Promise<void> {
  await sql.transaction(async (tx) => {
    await tx.query('delete from public.group_members where group_id = $1 and user_id = $2', [groupId, uid]);
    if (uid === ownerId) {
      const heir = (await tx.query<MemberRow>(
        `select m.user_id, m.joined_at from public.group_members m join auth.users u on u.id = m.user_id
         where m.group_id = $1 and not u.is_anonymous order by m.joined_at, m.user_id limit 1`, [groupId])).rows[0];
      if (!heir) {
        await tx.query('delete from public.groups where id = $1', [groupId]);
        return;
      }
      await tx.query('update public.groups set owner_id = $2 where id = $1', [groupId, heir.user_id]);
    } else if ((await tx.query('select 1 from public.group_members where group_id = $1', [groupId])).rowCount === 0) {
      await tx.query('delete from public.groups where id = $1', [groupId]);
      return;
    }
    await invalidateReadings(tx, groupId);
  });
}

export const postGroupLeave = defineRoute({
  name: 'POST /groups/{id}/leave', auth: 'required', rateLimit: DEFAULT_LIMIT,
  handler: async ({ deps, user, params }) => {
    const group = await loadGroup(deps.sql, params.id ?? '');
    if (!group || !(await isMember(deps.sql, group.id, user.uid))) throw new ApiFailure('NOT_FOUND', 'groupe introuvable');
    await removeMember(deps.sql, group.id, user.uid, group.owner_id);
    return { status: 204, body: null };
  },
});

export const deleteGroupMember = defineRoute({
  name: 'DELETE /groups/{id}/members/{userId}', auth: 'required', rateLimit: DEFAULT_LIMIT,
  handler: async ({ deps, user, params }) => {
    const group = await loadGroup(deps.sql, params.id ?? '');
    if (!group || !(await isMember(deps.sql, group.id, user.uid))) throw new ApiFailure('NOT_FOUND', 'groupe introuvable');
    if (group.owner_id !== user.uid) throw new ApiFailure('FORBIDDEN', 'réservé à la propriétaire');
    const target = params.userId ?? '';
    if (target === user.uid) throw new ApiFailure('CONFLICT', 'utiliser le départ pour se retirer soi-même');
    if (!UUID.test(target) || !(await isMember(deps.sql, group.id, target))) throw new ApiFailure('NOT_FOUND', 'membre introuvable');
    await removeMember(deps.sql, group.id, target, group.owner_id);
    return { status: 204, body: null };
  },
});
