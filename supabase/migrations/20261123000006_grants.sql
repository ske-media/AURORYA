-- Aurorya — privilèges des clients
-- Source : docs/SPEC.md §8.3, §12.5. Ne jamais modifier ce fichier une fois appliqué : ajouter une migration.

-- Les clients (rôles anon et authenticated) ne lisent que ce que la RLS autorise et n'écrivent jamais
-- (SPEC §8.3). On retire les privilèges par défaut de Supabase, puis on accorde la lecture table par table.
revoke all on all tables in schema public from anon, authenticated;
-- Les fonctions des extensions (trigrammes, unaccent) restent exécutables ; seule la limite de débit est réservée au serveur.
revoke all on function public.rate_limit_hit(text, int, int) from public, anon, authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on functions from public, anon, authenticated;

grant usage on schema public to anon, authenticated;
grant select on public.profiles, public.birth_data, public.charts, public.readings, public.entitlements,
                public.push_tokens, public.consents, public.geo_places, public.groups, public.group_invites,
                public.daily_sign_horoscopes, public.daily_questions, public.remote_config
  to authenticated;

-- group_members : les thèmes complets ne se partagent pas. Lecture colonne par colonne, sans chart_id (SPEC §12.5).
grant select (group_id, user_id, display_name, grammatical_gender, sun_sign, moon_sign, asc_sign, invited_by, joined_at)
  on public.group_members to authenticated;

-- group_invites : l'empreinte du jeton reste côté serveur.
revoke select on public.group_invites from authenticated;
grant select (id, group_id, created_by, code, expires_at, uses, revoked_at, created_at)
  on public.group_invites to authenticated;

grant execute on function public.is_group_member(uuid) to authenticated;
grant execute on function public.search_places(text, text, int) to authenticated;
grant execute on function public.normalize_place_search(text) to authenticated;
