-- Aurorya — tables personnelles
-- Source : docs/SPEC.md §12.3. Ne jamais modifier ce fichier une fois appliqué : ajouter une migration.

create table public.profiles (
  id                      uuid primary key references auth.users(id) on delete cascade,
  first_name              text not null check (char_length(first_name) between 1 and 24),
  grammatical_gender      grammatical_gender not null,
  locale                  text not null default 'fr' check (locale in ('fr', 'en')),
  tz                      text not null default 'Europe/Paris',
  tone_mode_default       tone_mode not null default 'cash',
  interests               text[] not null default '{}',
  astro_level             text check (astro_level in ('beginner', 'intermediate', 'advanced')),
  notif_enabled           boolean not null default false,
  notif_time              time not null default '08:00',
  sounds_enabled          boolean not null default true,
  haptics_enabled         boolean not null default true,
  analytics_consent       boolean,                -- null = pas encore demandé
  analytics_consent_at    timestamptz,
  onboarding_completed_at timestamptz,
  first_paywall_shown_at  timestamptz,
  came_from_invite        boolean not null default false,
  last_seen_at            timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create table public.birth_data (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null unique references public.profiles(id) on delete cascade,
  birth_date      date not null check (birth_date >= date '1900-01-01'),
  birth_time      time,
  time_precision  time_precision not null,
  time_window     text check (time_window in ('night', 'morning', 'afternoon', 'evening')),
  dst_choice      text check (dst_choice in ('first', 'second')),
  place_id        bigint not null references public.geo_places(geoname_id),
  place_label     text not null,          -- libellé figé au moment du choix
  country_code    char(2) not null,
  latitude        double precision not null check (latitude between -90 and 90),
  longitude       double precision not null check (longitude between -180 and 180),
  tz_iana         text not null,
  edit_count_30d  int not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  check ((time_precision = 'exact') = (birth_time is not null)),
  check ((time_precision = 'approx') = (time_window is not null))
);

create table public.charts (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  birth_data_id   uuid not null references public.birth_data(id) on delete cascade,
  chart_hash      text not null,
  engine_version  text not null,
  config_version  text not null,
  payload         jsonb not null,          -- ChartPayload (§11.6)
  sun_sign        text not null,
  moon_sign       text,                    -- null si incertain
  asc_sign        text,                    -- null sans heure exacte
  is_current      boolean not null default true,
  computed_at     timestamptz not null default now()
);
create unique index charts_one_current on public.charts (user_id) where is_current;
create index charts_hash on public.charts (chart_hash);

create table public.readings (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references public.profiles(id) on delete cascade,
  chart_id           uuid not null references public.charts(id) on delete cascade,
  kind               reading_kind not null,
  section_key        text,                 -- pour full_section
  local_date         date,                 -- pour daily_personal
  variant            int not null default 0, -- 0 = original ; >0 = régénérations
  mode               tone_mode not null,
  locale             text not null,
  grammatical_gender grammatical_gender not null,
  content            jsonb not null,       -- schéma selon kind (§14.5)
  facts_hash         text not null,
  prompt_version     text not null,
  kb_version         text not null,
  model              text not null,        -- ou 'fallback'
  status             text not null default 'ok' check (status in ('ok', 'fallback')),
  audio_url          text,                 -- V1.1
  created_at         timestamptz not null default now()
);
create unique index readings_cache_key on public.readings
  (chart_id, kind, coalesce(section_key, ''), coalesce(local_date, date '1970-01-01'),
   variant, mode, locale, grammatical_gender, prompt_version, kb_version);
create index readings_user on public.readings (user_id, kind, created_at desc);

create table public.entitlements (
  user_id      uuid primary key references public.profiles(id) on delete cascade,
  is_premium   boolean not null default false,
  product_id   text,
  period_type  text check (period_type in ('trial', 'intro', 'normal')),
  expires_at   timestamptz,
  will_renew   boolean,
  is_founder   boolean not null default false,
  rc_event_at  timestamptz not null,       -- horodatage du dernier événement appliqué
  updated_at   timestamptz not null default now()
);

create table public.push_tokens (
  user_id          uuid not null references public.profiles(id) on delete cascade,
  expo_push_token  text not null,
  updated_at       timestamptz not null default now(),
  primary key (user_id, expo_push_token)
);

create table public.consents (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  kind       text not null check (kind in ('terms', 'privacy', 'analytics', 'group_share')),
  granted    boolean not null,
  version    text not null,                -- version du texte accepté
  context    jsonb,                        -- ex. { "group_id": "…" }
  created_at timestamptz not null default now()
);

-- RLS : lecture de ses propres lignes uniquement. Aucune politique d'écriture (SPEC §8.3).
alter table public.profiles     enable row level security;
alter table public.birth_data   enable row level security;
alter table public.charts       enable row level security;
alter table public.readings     enable row level security;
alter table public.entitlements enable row level security;
alter table public.push_tokens  enable row level security;
alter table public.consents     enable row level security;

create policy profiles_select_own on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy birth_data_select_own on public.birth_data
  for select to authenticated using (user_id = (select auth.uid()));
create policy charts_select_own on public.charts
  for select to authenticated using (user_id = (select auth.uid()));
create policy readings_select_own on public.readings
  for select to authenticated using (user_id = (select auth.uid()));
create policy entitlements_select_own on public.entitlements
  for select to authenticated using (user_id = (select auth.uid()));
create policy push_tokens_select_own on public.push_tokens
  for select to authenticated using (user_id = (select auth.uid()));
create policy consents_select_own on public.consents
  for select to authenticated using (user_id = (select auth.uid()));
