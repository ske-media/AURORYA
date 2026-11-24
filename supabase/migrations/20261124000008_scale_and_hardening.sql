-- Aurorya — montée en charge et durcissement
-- Source : conseils de sécurité et de performance de Supabase sur le projet de production (2026-11-24).
-- Ne jamais modifier ce fichier une fois appliqué : ajouter une migration.

-- 1. Index sur les clés étrangères : les suppressions en cascade (compte, thème, groupe) et les jointures
--    ne doivent pas parcourir une table entière quand le nombre d'utilisatrices grandit.
create index if not exists charts_birth_data on public.charts (birth_data_id);
create index if not exists consents_user on public.consents (user_id, created_at desc);
create index if not exists group_members_chart on public.group_members (chart_id);
create index if not exists group_members_invited_by on public.group_members (invited_by) where invited_by is not null;
create index if not exists group_invites_group on public.group_invites (group_id);
create index if not exists group_invites_created_by on public.group_invites (created_by);
create index if not exists groups_owner on public.groups (owner_id);
create index if not exists reports_group on public.reports (group_id) where group_id is not null;
create index if not exists reports_reporter on public.reports (reporter_id);
create index if not exists birth_data_place on public.birth_data (place_id);
-- Purge des comptes anonymes inactifs et des limites de débit expirées (SPEC §12.7).
create index if not exists profiles_last_seen on public.profiles (last_seen_at);
create index if not exists rate_limits_window on public.rate_limits (window_start);
-- Webhook RevenueCat : recherche des événements d'une utilisatrice.
create index if not exists rc_webhook_events_user on public.rc_webhook_events (app_user_id, event_at desc);

-- 2. Une fonction « security definer » ne doit pas être appelable sans session.
revoke all on function public.is_group_member(uuid) from public, anon;
grant execute on function public.is_group_member(uuid) to authenticated;

-- 3. Sur Supabase, les extensions vivent dans le schéma « extensions », hors de l'API exposée.
--    Les fonctions de recherche l'ont déjà dans leur search_path.
do $$
declare
  ext text;
begin
  if exists (select 1 from pg_namespace where nspname = 'extensions') then
    foreach ext in array array['pg_trgm', 'unaccent', 'citext'] loop
      if exists (select 1 from pg_extension e join pg_namespace n on n.oid = e.extnamespace where e.extname = ext and n.nspname = 'public') then
        execute format('alter extension %I set schema extensions', ext);
      end if;
    end loop;
  end if;
end $$;
