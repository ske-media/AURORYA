#!/usr/bin/env bash
# `pnpm geo:load` — charge .cache/geo/geo_places.tsv dans la base désignée par DATABASE_URL.
# Remplace le contenu de geo_places sans toucher aux lieux déjà référencés par des données de naissance.
set -euo pipefail
: "${DATABASE_URL:?DATABASE_URL manquant}"
FILE="$(cd "$(dirname "$0")/../.." && pwd)/.cache/geo/geo_places.tsv"
[ -f "$FILE" ] || { echo "Lancer d'abord pnpm geo:build"; exit 1; }
psql "$DATABASE_URL" -X -q -v ON_ERROR_STOP=1 <<SQL
begin;
create temp table geo_import (like public.geo_places) on commit drop;
\copy geo_import (geoname_id, name, ascii_name, name_fr, name_en, admin1_name, country_code, latitude, longitude, population, tz_iana, search_text) from '$FILE'
insert into public.geo_places select * from geo_import
on conflict (geoname_id) do update set name = excluded.name, ascii_name = excluded.ascii_name, admin1_name = excluded.admin1_name,
  country_code = excluded.country_code, latitude = excluded.latitude, longitude = excluded.longitude, population = excluded.population,
  tz_iana = excluded.tz_iana, search_text = excluded.search_text;
commit;
select count(*) as lieux from public.geo_places;
SQL
