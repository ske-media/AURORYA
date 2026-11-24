-- Tests d'isolation (SPEC §12, §22.2). Chaque bloc lève une exception si une attente n'est pas tenue.
\set ON_ERROR_STOP on

-- Jeu de données écrit comme le fait l'API, avec la clé de service.
insert into auth.users (id) values
  ('00000000-0000-0000-0000-00000000000a'), ('00000000-0000-0000-0000-00000000000b'), ('00000000-0000-0000-0000-00000000000c');
grant select on auth.users to service_role;
set role service_role;
insert into public.geo_places (geoname_id, name, ascii_name, name_fr, name_en, admin1_name, country_code, latitude, longitude, population, tz_iana, search_text) values
  (1, 'Lyon', 'Lyon', 'Lyon', 'Lyon', 'Auvergne-Rhône-Alpes', 'FR', 45.76, 4.84, 500000, 'Europe/Paris', 'lyon'),
  (2, 'Lyons', 'Lyons', null, null, 'Georgia', 'US', 32.2, -82.3, 4000, 'America/New_York', 'lyons'),
  (3, 'Liège', 'Liege', 'Liège', 'Liege', 'Wallonie', 'BE', 50.63, 5.57, 195000, 'Europe/Brussels', 'liege'),
  (4, 'Lyon Mountain', 'Lyon Mountain', null, null, 'New York', 'US', 44.7, -73.9, 900000, 'America/New_York', 'lyon mountain');
insert into public.profiles (id, first_name, grammatical_gender)
  select id, 'Test', 'n' from auth.users;
insert into public.birth_data (user_id, birth_date, birth_time, time_precision, place_id, place_label, country_code, latitude, longitude, tz_iana)
  select id, date '1993-04-17', time '14:35', 'exact', 1, 'Lyon', 'FR', 45.76, 4.84, 'Europe/Paris' from auth.users;
insert into public.charts (id, user_id, birth_data_id, chart_hash, engine_version, config_version, payload, sun_sign)
  select ('10000000-0000-0000-0000-' || right(u.id::text, 12))::uuid, u.id, b.id, 'sha256:x', '1.0.0', '1', '{}', 'aries'
  from auth.users u join public.birth_data b on b.user_id = u.id;
insert into public.readings (user_id, chart_id, kind, mode, locale, grammatical_gender, content, facts_hash, prompt_version, kb_version, model)
  select user_id, id, 'roast', 'cash', 'fr', 'n', '{}', 'h', 'p', '1', 'm' from public.charts;
insert into public.entitlements (user_id, is_premium, rc_event_at) select id, true, now() from auth.users;
insert into public.push_tokens (user_id, expo_push_token) select id, 'tok-' || id from auth.users;
insert into public.consents (user_id, kind, granted, version) select id, 'analytics', true, '1' from auth.users;
insert into public.groups (id, owner_id, name, type) values
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 'Les copines', 'friends');
insert into public.group_members (group_id, user_id, display_name, grammatical_gender, sun_sign, chart_id)
  select '20000000-0000-0000-0000-000000000001', c.user_id, 'Test', 'n', 'aries', c.id from public.charts c
  where c.user_id in ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b');
insert into public.group_invites (group_id, created_by, token_hash, code, expires_at)
  values ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 'hash', 'ABCDEFGH', now() + interval '14 days');
insert into public.group_readings (group_id, kind, members_hash, mode, locale, content, prompt_version, kb_version, model)
  values ('20000000-0000-0000-0000-000000000001', 'roles_duos', 'h', 'cash', 'fr', '{"detail":"premium"}', 'p', '1', 'm');
insert into public.reports (reporter_id, group_id, reason) values ('00000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-000000000001', 'name');
insert into public.interpretation_kb (key, locale, kb_version, body) values ('planet_sign:moon:scorpio', 'fr', '1', '{}');
insert into public.daily_questions (locale, moon_sign, position, text, status) values ('fr', 'aries', 0, 'Approuvée ?', 'approved'), ('fr', 'aries', 1, 'Brouillon ?', 'draft');
insert into public.ai_usage (user_id, feature, tier, model, tokens_in, tokens_out, cost_microusd, outcome) values ('00000000-0000-0000-0000-00000000000a', 'roast', 'strong', 'm', 1, 1, 1, 'ok');
insert into public.waitlist (email, consent_at, unsub_token_hash) values ('A@Example.com', now(), 'u');
insert into public.rc_webhook_events (event_id, type, app_user_id, event_at, payload) values ('e1', 'INITIAL_PURCHASE', 'a', now(), '{"period_type":"TRIAL"}');
reset role;

create function pg_temp.expect(condition boolean, label text) returns void language plpgsql as $$
begin
  if condition is not true then raise exception 'ÉCHEC : %', label; end if;
  raise notice 'ok : %', label;
end $$;
create function pg_temp.denied(statement text) returns boolean language plpgsql as $$
begin
  execute statement;
  return false;
exception when insufficient_privilege then return true;
end $$;
grant execute on all functions in schema pg_temp to authenticated, anon;

-- Utilisatrice A.
set role authenticated;
set request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';
select pg_temp.expect((select count(*) from public.profiles) = 1, 'A ne voit que son profil');
select pg_temp.expect((select count(*) from public.birth_data) = 1, 'A ne voit que ses données de naissance');
select pg_temp.expect((select count(*) from public.charts) = 1, 'A ne voit que son thème');
select pg_temp.expect((select count(*) from public.readings) = 1, 'A ne voit que ses lectures');
select pg_temp.expect((select count(*) from public.entitlements) = 1, 'A ne voit que son droit');
select pg_temp.expect((select count(*) from public.push_tokens) = 1, 'A ne voit que ses jetons');
select pg_temp.expect((select count(*) from public.consents) = 1, 'A ne voit que ses consentements');
select pg_temp.expect((select count(*) from public.groups) = 1, 'A voit son groupe');
select pg_temp.expect((select count(display_name) from public.group_members) = 2, 'A voit les deux membres du groupe');
select pg_temp.expect(pg_temp.denied('select chart_id from public.group_members'), 'chart_id d''une autre membre illisible');
select pg_temp.expect(pg_temp.denied('select * from public.group_members'), 'lecture de toutes les colonnes de group_members refusée');
select pg_temp.expect(pg_temp.denied('select token_hash from public.group_invites'), 'empreinte du jeton d''invitation illisible');
select pg_temp.expect((select count(code) from public.group_invites) = 1, 'A voit le code d''invitation de son groupe');
select pg_temp.expect(pg_temp.denied('select * from public.group_readings'), 'group_readings illisible');
select pg_temp.expect(pg_temp.denied('select * from public.reports'), 'reports illisible');
select pg_temp.expect(pg_temp.denied('select * from public.interpretation_kb'), 'base de règles illisible');
select pg_temp.expect(pg_temp.denied('select * from public.ai_usage'), 'ai_usage illisible');
select pg_temp.expect(pg_temp.denied('select * from public.rate_limits'), 'rate_limits illisible');
select pg_temp.expect(pg_temp.denied('select * from public.rc_webhook_events'), 'événements RevenueCat illisibles');
select pg_temp.expect(pg_temp.denied('select * from public.waitlist'), 'liste d''attente illisible');
select pg_temp.expect(pg_temp.denied('select * from public.kpi_invites'), 'vues d''exploitation illisibles');
select pg_temp.expect(pg_temp.denied('select public.rate_limit_hit(''k'', 1, 60)'), 'rate_limit_hit réservée au serveur');
select pg_temp.expect((select count(*) from public.remote_config where not is_public) = 0, 'configuration privée invisible');
select pg_temp.expect((select count(*) from public.remote_config) >= 10, 'configuration publique visible');
select pg_temp.expect((select count(*) from public.daily_questions) = 1, 'seules les questions approuvées sont visibles');
-- Aucune écriture côté client.
select pg_temp.expect(pg_temp.denied('update public.profiles set first_name = ''Pirate'''), 'mise à jour du profil refusée');
select pg_temp.expect(pg_temp.denied('insert into public.entitlements (user_id, is_premium, rc_event_at) values (auth.uid(), true, now())'), 'insertion d''un droit refusée');
select pg_temp.expect(pg_temp.denied('update public.entitlements set is_premium = true'), 'mise à jour d''un droit refusée');
select pg_temp.expect(pg_temp.denied('delete from public.charts'), 'suppression d''un thème refusée');
select pg_temp.expect(pg_temp.denied('insert into public.group_members (group_id, user_id, display_name, grammatical_gender, sun_sign, chart_id) select group_id, user_id, ''x'', ''n'', ''aries'', chart_id from public.group_members'), 'insertion d''une membre refusée');
select pg_temp.expect(pg_temp.denied('update public.remote_config set value = ''999'''), 'modification de la configuration refusée');
-- Recherche de lieux.
select pg_temp.expect((select array_agg(geoname_id) from public.search_places('ly', 'fr', 8)) = array[1::bigint, 4, 2], 'recherche : préfixe, marchés visés d''abord, puis population');
select pg_temp.expect((select name from public.search_places('Liège', 'fr', 8) limit 1) = 'Liège', 'recherche insensible aux accents');
select pg_temp.expect((select count(*) from public.search_places('l', 'fr', 8)) = 0, 'recherche à partir de deux caractères');

-- Utilisatrice C : hors du groupe.
set request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c"}';
select pg_temp.expect((select count(*) from public.groups) = 0, 'C ne voit aucun groupe');
select pg_temp.expect((select count(display_name) from public.group_members) = 0, 'C ne voit aucune membre');
select pg_temp.expect((select count(code) from public.group_invites) = 0, 'C ne voit aucune invitation');
select pg_temp.expect((select count(*) from public.charts where user_id <> auth.uid()) = 0, 'C ne lit le thème de personne');

-- Visiteur non authentifié.
set role anon;
reset request.jwt.claims;
select pg_temp.expect(pg_temp.denied('select * from public.profiles'), 'anon ne lit pas les profils');
select pg_temp.expect(pg_temp.denied('select * from public.remote_config'), 'anon ne lit pas la configuration');
select pg_temp.expect(pg_temp.denied('select * from public.geo_places'), 'anon ne lit pas les lieux');

-- Serveur : limite de débit et cascade de suppression.
set role service_role;
select pg_temp.expect(not public.rate_limit_hit('roast:uid:a', 2, 3600), 'limite : premier appel accepté');
select pg_temp.expect(not public.rate_limit_hit('roast:uid:a', 2, 3600), 'limite : deuxième appel accepté');
select pg_temp.expect(public.rate_limit_hit('roast:uid:a', 2, 3600), 'limite : troisième appel refusé');
select pg_temp.expect((select trials_started from public.kpi_trials) = 1, 'vue kpi_trials lisible par le serveur');
reset role;
delete from auth.users where id = '00000000-0000-0000-0000-00000000000b';
select pg_temp.expect((select count(*) from public.profiles) = 2 and (select count(*) from public.charts) = 2 and (select count(*) from public.group_members) = 1 and (select count(*) from public.readings) = 2,
  'supprimer un compte emporte profil, thème, lectures et appartenances');
select pg_temp.expect((select count(*) from pg_tables t where t.schemaname = 'public' and not exists (
  select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname = t.tablename and c.relrowsecurity)) = 0,
  'RLS activée sur toutes les tables du schéma public');

-- Durcissement : la fonction d'appartenance n'est pas appelable sans session.
set role anon;
select pg_temp.expect(pg_temp.denied('select public.is_group_member(''20000000-0000-0000-0000-000000000001'')'), 'anon ne peut pas appeler is_group_member');
reset role;
