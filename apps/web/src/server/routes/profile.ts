// GET /config et PUT /profile (SPEC §13.3).
import { type Profile, PutProfileInputSchema } from '@aurorya/shared';
import { z } from 'zod';
import { ApiFailure, defineRoute, isPremium } from '../http';
import { configValue, publicConfig } from '../remote-config';

export const getConfig = defineRoute({
  name: 'GET /config',
  auth: 'required',
  rateLimit: { configKey: 'limits.default_per_hour', fallback: 300, windowSeconds: 3600 },
  handler: async ({ deps, user }) => {
    await deps.sql.query('update public.profiles set last_seen_at = $2 where id = $1', [user.uid, deps.now()]);
    return {
      body: {
        config: await publicConfig(deps.sql, deps.now()),
        entitlement: { premium: await isPremium(deps, user.uid) },
        foundersRemaining: await configValue(deps.sql, deps.now(), 'offers.founders_remaining', z.number().int(), 0),
      },
    };
  },
});

type ProfileRow = { id: string; first_name: string; grammatical_gender: Profile['grammaticalGender']; locale: Profile['locale']; tz: string; interests: string[]; astro_level: Profile['astroLevel']; tone_mode_default: Profile['toneModeDefault'] };
const toProfile = (r: ProfileRow): Profile => ({
  id: r.id, firstName: r.first_name, grammaticalGender: r.grammatical_gender, locale: r.locale, tz: r.tz,
  interests: r.interests, astroLevel: r.astro_level, toneModeDefault: r.tone_mode_default,
});

export const putProfile = defineRoute({
  name: 'PUT /profile',
  auth: 'required',
  input: PutProfileInputSchema,
  rateLimit: { configKey: 'limits.default_per_hour', fallback: 300, windowSeconds: 3600 },
  handler: async ({ deps, user, input }) => {
    const firstName = deps.nameFilter.firstName(input.firstName);
    if (firstName === null) throw new ApiFailure('NAME_REJECTED', 'prénom refusé');
    const { rows } = await deps.sql.query<ProfileRow>(
      `insert into public.profiles (id, first_name, grammatical_gender, locale, tz, interests, astro_level, tone_mode_default, last_seen_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       on conflict (id) do update set first_name = excluded.first_name, grammatical_gender = excluded.grammatical_gender,
         locale = excluded.locale, tz = excluded.tz, interests = excluded.interests, astro_level = excluded.astro_level,
         tone_mode_default = excluded.tone_mode_default, updated_at = excluded.last_seen_at, last_seen_at = excluded.last_seen_at
       returning id, first_name, grammatical_gender, locale, tz, interests, astro_level, tone_mode_default`,
      [user.uid, firstName, input.grammaticalGender, input.locale, input.tz, input.interests, input.astroLevel, input.toneModeDefault, deps.now()],
    );
    const row = rows[0];
    if (!row) throw new Error('profil non écrit');
    return { body: toProfile(row) };
  },
});
