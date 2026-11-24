-- Aurorya — extensions et types
-- Source : docs/SPEC.md §12.2. Ne jamais modifier ce fichier une fois appliqué : ajouter une migration.

create extension if not exists pg_trgm;
create extension if not exists unaccent;
create extension if not exists citext;

create type tone_mode          as enum ('soft', 'cash', 'expert');
create type grammatical_gender as enum ('f', 'm', 'n');
create type time_precision     as enum ('exact', 'approx', 'unknown');
create type group_type         as enum ('friends', 'couple', 'family', 'colleagues');
create type reading_kind       as enum ('roast', 'full_section', 'daily_personal');
create type group_reading_kind as enum ('roles_duos', 'weekly_weather');
create type kb_review_status   as enum ('draft_ai', 'reviewed', 'approved');
