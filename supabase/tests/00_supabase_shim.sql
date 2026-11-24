-- Imitation minimale de Supabase pour tester les migrations sur un Postgres nu : rôles, schéma auth, auth.uid().
-- Utilisée uniquement par scripts/db/test-local.sh. Jamais appliquée à un vrai projet.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
create table auth.users (id uuid primary key default gen_random_uuid(), is_anonymous boolean not null default false);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'sub', '')::uuid;
$$;
grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;
-- Privilèges par défaut que Supabase accorde aux rôles clients sur le schéma public.
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
grant all on schema public to service_role;
