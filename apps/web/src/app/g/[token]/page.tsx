// Page d'invitation (SPEC §7.10) : prénom de l'invitante, nom du groupe, code. Aucune autre donnée.
import type { Metadata } from 'next';
import { fill, messages } from '@/messages';
import { hashInviteToken } from '@/server/invites';
import { getDeps } from '@/server/runtime';

// Aperçu de lien générique, sans nom ; page non indexée.
export const metadata: Metadata = { title: messages.brand.name, robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

type Row = { code: string; inviter: string; group_name: string; expires_at: Date; revoked_at: Date | null; members: string };

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const deps = getDeps();
  const invite = (await deps.sql.query<Row>(
    `select i.code, p.first_name as inviter, g.name as group_name, i.expires_at, i.revoked_at,
            (select count(*) from public.group_members m where m.group_id = g.id) as members
     from public.group_invites i join public.groups g on g.id = i.group_id join public.profiles p on p.id = i.created_by
     where i.token_hash = $1`, [hashInviteToken(token)])).rows[0];
  const valid = invite !== undefined && invite.revoked_at === null && new Date(invite.expires_at).getTime() > deps.now().getTime() && Number(invite.members) < 8;
  if (!invite || !valid) {
    return (
      <main>
        <p className="accent">{messages.brand.name}</p>
        <h1>{messages.invite.invalid}</h1>
      </main>
    );
  }
  return (
    <main>
      <p className="accent">{messages.brand.name}</p>
      <h1>{fill(messages.invite.title, { inviter: invite.inviter, group: invite.group_name })}</h1>
      <div className="card">
        <p className="muted">{messages.invite.codeLabel}</p>
        <p className="code">{invite.code}</p>
        <p className="muted">{messages.invite.howTo}</p>
      </div>
      <a className="button" href={`aurorya://groups/join/${encodeURIComponent(token)}`}>{messages.invite.open}</a>
    </main>
  );
}
