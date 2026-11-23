-- Aurorya — groupes
-- Source : docs/SPEC.md §12.5. Ne jamais modifier ce fichier une fois appliqué : ajouter une migration.

create table public.groups (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references public.profiles(id) on delete cascade,
  name        text not null check (char_length(name) between 2 and 30),
  type        group_type not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.group_members (
  group_id           uuid not null references public.groups(id) on delete cascade,
  user_id            uuid not null references public.profiles(id) on delete cascade,
  display_name       text not null check (char_length(display_name) between 1 and 24),
  grammatical_gender grammatical_gender not null,
  sun_sign           text not null,
  moon_sign          text,
  asc_sign           text,
  chart_id           uuid not null references public.charts(id) on delete cascade,
  invited_by         uuid references public.profiles(id) on delete set null,
  joined_at          timestamptz not null default now(),
  primary key (group_id, user_id)
);
create index group_members_user on public.group_members (user_id);

create table public.group_invites (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid not null references public.groups(id) on delete cascade,
  created_by  uuid not null references public.profiles(id) on delete cascade,
  token_hash  text not null unique,         -- SHA-256 du jeton ; le jeton n'est jamais stocké
  code        text not null unique,         -- 8 caractères
  expires_at  timestamptz not null,
  uses        int not null default 0,
  revoked_at  timestamptz,
  created_at  timestamptz not null default now()
);

create table public.group_readings (
  id              uuid primary key default gen_random_uuid(),
  group_id        uuid not null references public.groups(id) on delete cascade,
  kind            group_reading_kind not null,
  iso_week        text,                     -- "2027-W02" pour weekly_weather
  members_hash    text not null,            -- empreinte des chart_id des membres, triés
  mode            tone_mode not null,
  locale          text not null,
  content         jsonb not null,           -- parties gratuites et détaillées séparées (§14.5)
  prompt_version  text not null,
  kb_version      text not null,
  model           text not null,
  status          text not null default 'ok' check (status in ('ok', 'fallback')),
  created_at      timestamptz not null default now()
);
create unique index group_readings_cache_key on public.group_readings
  (group_id, kind, coalesce(iso_week, ''), members_hash, mode, locale, prompt_version, kb_version);

create table public.reports (
  id           uuid primary key default gen_random_uuid(),
  reporter_id  uuid not null references public.profiles(id) on delete cascade,
  group_id     uuid references public.groups(id) on delete set null,
  reason       text not null check (reason in ('name', 'content', 'harassment', 'other')),
  details      text check (char_length(details) <= 500),
  status       text not null default 'open' check (status in ('open', 'reviewed', 'actioned')),
  created_at   timestamptz not null default now()
);

alter table public.groups          enable row level security;
alter table public.group_members   enable row level security;
alter table public.group_invites   enable row level security;
-- Pas de politique : contenu Premium servi par l'API uniquement.
alter table public.group_readings  enable row level security;
-- Pas de politique : aucune lecture côté client.
alter table public.reports         enable row level security;

create or replace function public.is_group_member(gid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.group_members m
    where m.group_id = gid and m.user_id = (select auth.uid())
  );
$$;

create policy groups_select_member on public.groups
  for select to authenticated using (public.is_group_member(id));
create policy group_members_select_member on public.group_members
  for select to authenticated using (public.is_group_member(group_id));
create policy group_invites_select_member on public.group_invites
  for select to authenticated using (public.is_group_member(group_id));

-- Realtime : arrivée d'une membre en direct (SPEC §12.5). La publication n'existe que sur Supabase.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.group_members;
  end if;
end $$;
