-- Aurorya — contenu et exploitation
-- Source : docs/SPEC.md §12.6. Ne jamais modifier ce fichier une fois appliqué : ajouter une migration.

create table public.interpretation_kb (
  key            text not null,             -- ex. 'planet_sign:moon:scorpio'
  locale         text not null,
  kb_version     text not null,
  body           jsonb not null,            -- schéma au §14.3
  review_status  kb_review_status not null default 'draft_ai',
  reviewed_by    text,
  updated_at     timestamptz not null default now(),
  primary key (key, locale, kb_version)
);

create table public.daily_sign_horoscopes (
  day             date not null,
  sign            text not null,
  mode            tone_mode not null,
  locale          text not null,
  content         jsonb not null,           -- { headline, body }
  sky_hash        text not null,
  prompt_version  text not null,
  model           text not null,
  status          text not null default 'ok',
  created_at      timestamptz not null default now(),
  primary key (day, sign, mode, locale)
);

create table public.daily_questions (
  id         uuid primary key default gen_random_uuid(),
  locale     text not null,
  moon_sign  text not null,
  position   int not null,                  -- rang dans la rotation de ce signe
  text       text not null check (char_length(text) <= 140),
  status     text not null default 'approved' check (status in ('draft', 'approved')),
  unique (locale, moon_sign, position)
);

create table public.remote_config (
  key         text primary key,
  value       jsonb not null,
  is_public   boolean not null default false,  -- renvoyé ou non à l'app
  updated_at  timestamptz not null default now()
);

create table public.ai_usage (
  id            bigint generated always as identity primary key,
  user_id       uuid,                        -- sans clé étrangère : survit à la suppression, puis anonymisé
  feature       text not null,               -- roast, section, daily_personal, daily_sign, group_roles, group_weather, judge
  tier          text not null,
  model         text not null,
  tokens_in     int not null,
  tokens_out    int not null,
  cost_microusd bigint not null,
  outcome       text not null check (outcome in ('ok', 'retry_ok', 'fallback', 'error')),
  created_at    timestamptz not null default now()
);
create index ai_usage_day on public.ai_usage (created_at);

create table public.rate_limits (
  key           text not null,               -- ex. 'roast:uid:<uuid>'
  window_start  timestamptz not null,
  count         int not null default 0,
  primary key (key, window_start)
);

create table public.rc_webhook_events (
  event_id      text primary key,            -- identifiant RevenueCat : idempotence
  type          text not null,
  app_user_id   text not null,
  event_at      timestamptz not null,
  payload       jsonb not null,
  processed_at  timestamptz
);

create table public.waitlist (
  id                  uuid primary key default gen_random_uuid(),
  email               citext not null unique,
  locale              text not null default 'fr',
  sun_sign            text,
  source              text,
  consent_at          timestamptz not null,
  confirm_token_hash  text,
  confirmed_at        timestamptz,
  unsub_token_hash    text not null,
  unsubscribed_at     timestamptz,
  created_at          timestamptz not null default now()
);

alter table public.interpretation_kb     enable row level security;
alter table public.daily_sign_horoscopes enable row level security;
alter table public.daily_questions       enable row level security;
alter table public.remote_config         enable row level security;
alter table public.ai_usage              enable row level security;
alter table public.rate_limits           enable row level security;
alter table public.rc_webhook_events     enable row level security;
alter table public.waitlist              enable row level security;

create policy daily_sign_horoscopes_read on public.daily_sign_horoscopes
  for select to authenticated using (true);
create policy daily_questions_read on public.daily_questions
  for select to authenticated using (status = 'approved');
create policy remote_config_read_public on public.remote_config
  for select to authenticated using (is_public);

-- Limite de débit atomique (SPEC §12.6). Renvoie vrai si la limite est dépassée.
create or replace function public.rate_limit_hit(p_key text, p_limit int, p_window_seconds int)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_window timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_count int;
begin
  insert into public.rate_limits as r (key, window_start, count)
  values (p_key, v_window, 1)
  on conflict (key, window_start) do update set count = r.count + 1
  returning r.count into v_count;
  return v_count > p_limit;
end $$;

-- Vues d'exploitation, lues par la clé de service (SPEC §4.4, §12.6).
create view public.kpi_invites with (security_invoker = true) as
  select (select count(*) from public.group_members where invited_by is not null)::numeric as accepted_invites,
         (select count(distinct user_id) from public.readings where kind = 'roast')::numeric as roast_viewers;

-- Le nom du champ de période d'essai dans les événements RevenueCat est à vérifier au ticket T-060.
create view public.kpi_trials with (security_invoker = true) as
  select (select count(distinct app_user_id) from public.rc_webhook_events
           where type = 'INITIAL_PURCHASE' and upper(payload ->> 'period_type') = 'TRIAL')::numeric as trials_started,
         (select count(distinct user_id) from public.readings where kind = 'roast')::numeric as roast_viewers;

create view public.ai_cost_daily with (security_invoker = true) as
  select date_trunc('day', created_at)::date as day, feature, tier, outcome,
         count(*) as calls, sum(tokens_in) as tokens_in, sum(tokens_out) as tokens_out, sum(cost_microusd) as cost_microusd
  from public.ai_usage group by 1, 2, 3, 4;

create view public.founders_count with (security_invoker = true) as
  select count(*) as founders from public.entitlements where is_founder;
