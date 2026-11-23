// Liste d'attente (SPEC §7.10) : consentement explicite, double confirmation, désinscription.
import { SIGN_IDS } from '@aurorya/shared';
import { z } from 'zod';
import { ApiFailure, defineRoute } from './http';
import { generateInviteToken, hashInviteToken } from './invites';
import { configValue } from './remote-config';

export const WaitlistInputSchema = z.strictObject({
  email: z.string().trim().toLowerCase().email().max(254),
  sunSign: z.enum(SIGN_IDS).nullable().default(null),
  locale: z.enum(['fr', 'en']).default('fr'),
  /** Case non précochée : le consentement doit être donné explicitement. */
  consent: z.literal(true),
  source: z.string().max(40).nullable().default(null),
});

export const postWaitlist = defineRoute({
  name: 'POST /waitlist', auth: 'none', input: WaitlistInputSchema,
  rateLimit: { configKey: 'limits.waitlist_per_hour_ip', fallback: 5, windowSeconds: 3600 },
  handler: async ({ deps, input }) => {
    if (!(await configValue(deps.sql, deps.now(), 'flags.waitlist_enabled', z.boolean(), true))) throw new ApiFailure('FORBIDDEN', 'liste d’attente fermée');
    const confirmToken = generateInviteToken();
    const unsubToken = generateInviteToken();
    // Même réponse que l'adresse soit nouvelle ou déjà inscrite : on ne révèle pas qui est sur la liste.
    const inserted = await deps.sql.query(
      `insert into public.waitlist (email, locale, sun_sign, source, consent_at, confirm_token_hash, unsub_token_hash)
       values ($1, $2, $3, $4, $5, $6, $7) on conflict (email) do nothing returning id`,
      [input.email, input.locale, input.sunSign, input.source, deps.now(), hashInviteToken(confirmToken), hashInviteToken(unsubToken)]);
    if (inserted.rowCount > 0) await deps.sendEmail?.({ kind: 'waitlist_confirm', to: input.email, locale: input.locale, confirmToken, unsubToken });
    return { status: 202, body: { accepted: true } };
  },
});

const tokenOf = (request: Request): string => new URL(request.url).searchParams.get('token') ?? '';

/** Confirme une inscription. Renvoie vrai si un jeton valide a été consommé. */
export async function confirmWaitlist(deps: Parameters<typeof postWaitlist>[1], request: Request): Promise<boolean> {
  const token = tokenOf(request);
  if (token.length === 0) return false;
  const result = await deps.sql.query(
    'update public.waitlist set confirmed_at = coalesce(confirmed_at, $2), confirm_token_hash = null where confirm_token_hash = $1 and unsubscribed_at is null', [hashInviteToken(token), deps.now()]);
  return result.rowCount > 0;
}

export async function unsubscribeWaitlist(deps: Parameters<typeof postWaitlist>[1], request: Request): Promise<boolean> {
  const token = tokenOf(request);
  if (token.length === 0) return false;
  const result = await deps.sql.query('update public.waitlist set unsubscribed_at = coalesce(unsubscribed_at, $2) where unsub_token_hash = $1', [hashInviteToken(token), deps.now()]);
  return result.rowCount > 0;
}
