-- Aurorya — lieux de naissance
-- Source : docs/SPEC.md §12.4. Ne jamais modifier ce fichier une fois appliqué : ajouter une migration.

create table public.geo_places (
  geoname_id    bigint primary key,
  name          text not null,
  ascii_name    text not null,
  name_fr       text,
  name_en       text,
  admin1_name   text,
  country_code  char(2) not null,
  latitude      double precision not null,
  longitude     double precision not null,
  population    int not null default 0,
  tz_iana       text not null,
  search_text   text not null               -- minuscules, sans accents, rempli à l'import
);
create index geo_places_trgm on public.geo_places using gin (search_text gin_trgm_ops);
alter table public.geo_places enable row level security;
create policy geo_places_read on public.geo_places for select to authenticated using (true);

-- Sur Supabase, les extensions vivent dans le schéma « extensions » : il figure dans le search_path des fonctions.
-- Normalisation commune à l'import et à la recherche : minuscules, sans accents, espaces rognés.
create or replace function public.normalize_place_search(q text)
returns text language sql stable set search_path = public, extensions as $$
  select btrim(regexp_replace(lower(unaccent(q)), '[^a-z0-9]+', ' ', 'g'));
$$;

-- Recherche de lieux (SPEC §12.4). Tri : préfixe exact, pays des marchés visés, population décroissante.
create or replace function public.search_places(q text, lang text default 'fr', max_results int default 8)
returns table (
  geoname_id bigint, name text, admin1_name text, country_code char(2),
  latitude double precision, longitude double precision, tz_iana text
)
language sql stable set search_path = public, extensions as $$
  with needle as (select public.normalize_place_search(q) as n)
  select p.geoname_id,
         coalesce(case when lang = 'en' then p.name_en else p.name_fr end, p.name) as name,
         p.admin1_name, p.country_code, p.latitude, p.longitude, p.tz_iana
  from public.geo_places p, needle
  where char_length(needle.n) >= 2
    and (p.search_text like needle.n || '%' or p.search_text % needle.n)
  order by (p.search_text like needle.n || '%') desc,
           (p.country_code in ('FR', 'BE', 'CH', 'LU', 'CA')) desc,
           p.population desc,
           p.geoname_id
  limit least(greatest(max_results, 1), 20);
$$;
