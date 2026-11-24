-- Aurorya — configuration distante initiale
-- Source : docs/SPEC.md §13.7, §13.8 ; ai.routing et ai.daily_budget_microusd attendent O-08 et T-033. Ne jamais modifier ce fichier une fois appliqué : ajouter une migration.

insert into public.remote_config (key, value, is_public) values
  ('app.min_build', '1', true),
  ('flags.locale_en_enabled', 'false', true),
  ('flags.theme_light_enabled', 'false', true),
  ('flags.waitlist_enabled', 'true', true),
  ('flags.groups_enabled', 'true', true),
  ('flags.ghosts_enabled', 'true', true),
  ('flags.ai_generation_enabled', 'true', false),
  ('flags.roast_regen_enabled', 'true', true),
  ('quota.roast_regen_per_day', '3', true),
  ('quota.groups_free', '3', true),
  ('quota.groups_premium', '20', true),
  ('quota.birth_edits_per_30d', '3', true),
  ('policy.min_age', '16', true),
  ('offers.founders_enabled', 'false', true),
  ('offers.founders_total', '500', true),
  ('offers.founders_remaining', '500', true),
  ('content.kb_version', '"1"', false),
  ('limits.charts_per_hour', '10', false),
  ('limits.roasts_per_hour', '20', false),
  ('limits.sections_per_hour', '60', false),
  ('limits.group_readings_per_hour', '30', false),
  ('limits.ghost_readings_per_day', '20', false),
  ('limits.joins_per_hour', '10', false),
  ('limits.invite_previews_per_hour_ip', '60', false),
  ('limits.waitlist_per_hour_ip', '5', false),
  ('limits.default_per_hour', '300', false)
on conflict (key) do nothing;
