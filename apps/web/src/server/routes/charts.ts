// POST /charts (SPEC §13.3) : calcule et enregistre le thème. Coordonnées et fuseau viennent de la base.
import { computeChart } from '@aurorya/astro-engine';
import { type ChartPayload, type ChartSummary, PostChartsInputSchema } from '@aurorya/shared';
import { z } from 'zod';
import { ApiFailure, defineRoute } from '../http';
import { configValue } from '../remote-config';

/** Âge révolu à une date donnée, en années entières. */
export const ageOn = (birthDate: string, today: Date): number => {
  const [y, m, d] = birthDate.split('-').map(Number) as [number, number, number];
  const age = today.getUTCFullYear() - y;
  const hadBirthday = today.getUTCMonth() + 1 > m || (today.getUTCMonth() + 1 === m && today.getUTCDate() >= d);
  return hadBirthday ? age : age - 1;
};

const summary = (chartId: string, chart: ChartPayload): ChartSummary => {
  const sun = chart.bodies.find((b) => b.id === 'sun');
  const moon = chart.bodies.find((b) => b.id === 'moon');
  if (!sun) throw new Error('thème sans Soleil');
  return { chartId, sunSign: sun.sign, moonSign: moon && !moon.signUncertain ? moon.sign : null, ascSign: chart.angles?.asc.sign ?? null, flags: chart.flags };
};

export const postCharts = defineRoute({
  name: 'POST /charts',
  auth: 'required',
  input: PostChartsInputSchema,
  rateLimit: { configKey: 'limits.charts_per_hour', fallback: 10, windowSeconds: 3600 },
  handler: async ({ deps, user, input }) => {
    const { sql } = deps;
    const now = deps.now();
    const minAge = await configValue(sql, now, 'policy.min_age', z.number().int(), 16);
    if (ageOn(input.date, now) < minAge) throw new ApiFailure('AGE_RESTRICTED', 'âge minimum non atteint');

    const profile = await sql.query('select 1 from public.profiles where id = $1', [user.uid]);
    if (profile.rowCount === 0) throw new ApiFailure('CONFLICT', 'profil requis avant le thème');
    const place = (await sql.query<{ geoname_id: string; name: string; name_fr: string | null; admin1_name: string | null; country_code: string; latitude: number; longitude: number; tz_iana: string }>(
      'select geoname_id, name, name_fr, admin1_name, country_code, latitude, longitude, tz_iana from public.geo_places where geoname_id = $1', [input.placeId])).rows[0];
    if (!place) throw new ApiFailure('VALIDATION_FAILED', 'lieu inconnu', { fields: ['placeId'] });

    const computed = computeChart({
      date: input.date, time: input.time, timePrecision: input.timePrecision, timeWindow: input.timeWindow, dstChoice: input.dstChoice,
      latitude: place.latitude, longitude: place.longitude, tzIana: place.tz_iana, houseSystem: 'placidus',
    }, deps.engineConfig);
    if (!computed.ok) {
      if (computed.error.code === 'BIRTH_TIME_NONEXISTENT') throw new ApiFailure('BIRTH_TIME_NONEXISTENT', 'heure inexistante ce jour-là à cet endroit');
      throw new ApiFailure('VALIDATION_FAILED', 'données de naissance invalides', { reason: computed.error.code });
    }
    const chart = computed.value;

    // Même naissance, même moteur : le thème courant est renvoyé tel quel.
    const current = (await sql.query<{ id: string; chart_hash: string }>('select id, chart_hash from public.charts where user_id = $1 and is_current', [user.uid])).rows[0];
    if (current?.chart_hash === chart.chartHash) return { body: summary(current.id, chart) };

    // Retour à des données déjà saisies : l'ancien thème redevient courant, avec toutes ses lectures déjà
    // générées. Rien n'est recalculé ni régénéré, et ce retour ne compte pas dans le quota de modifications.
    const previous = (await sql.query<{ id: string }>(
      'select id from public.charts where user_id = $1 and chart_hash = $2 and not is_current order by computed_at desc limit 1', [user.uid, chart.chartHash])).rows[0];
    if (previous) {
      await sql.transaction(async (tx) => {
        await tx.query('update public.charts set is_current = false where user_id = $1 and is_current', [user.uid]);
        await tx.query('update public.charts set is_current = true where id = $1', [previous.id]);
        await tx.query(`update public.birth_data set birth_date = $2, birth_time = $3, time_precision = $4, time_window = $5, dst_choice = $6, updated_at = $7
                        where user_id = $1`, [user.uid, input.date, input.time, input.timePrecision, input.timeWindow, input.dstChoice, now]);
        const sunSign = chart.bodies.find((b) => b.id === 'sun')?.sign;
        const moon = chart.bodies.find((b) => b.id === 'moon');
        await tx.query('update public.group_members set chart_id = $2, sun_sign = $3, moon_sign = $4, asc_sign = $5 where user_id = $1',
          [user.uid, previous.id, sunSign, moon && !moon.signUncertain ? moon.sign : null, chart.angles?.asc.sign ?? null]);
        await tx.query('delete from public.group_readings where group_id in (select group_id from public.group_members where user_id = $1)', [user.uid]);
      });
      return { body: summary(previous.id, chart) };
    }

    // Quota de modifications : au-delà du tout premier thème, sur trente jours glissants.
    if (current) {
      const quota = await configValue(sql, now, 'quota.birth_edits_per_30d', z.number().int(), 3);
      const recent = (await sql.query<{ n: string }>(
        `select count(*) as n from public.charts where user_id = $1 and computed_at > $2
           and id <> (select id from public.charts where user_id = $1 order by computed_at limit 1)`,
        [user.uid, new Date(now.getTime() - 30 * 86_400_000)])).rows[0];
      if (Number(recent?.n ?? 0) >= quota) throw new ApiFailure('QUOTA_EXCEEDED', 'trop de modifications des données de naissance');
    }

    const label = [place.name_fr ?? place.name, place.admin1_name].filter(Boolean).join(', ');
    const sun = chart.bodies.find((b) => b.id === 'sun');
    const moon = chart.bodies.find((b) => b.id === 'moon');
    const chartId = await sql.transaction(async (tx) => {
      const birth = (await tx.query<{ id: string }>(
        `insert into public.birth_data (user_id, birth_date, birth_time, time_precision, time_window, dst_choice, place_id, place_label, country_code, latitude, longitude, tz_iana, updated_at)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         on conflict (user_id) do update set birth_date = excluded.birth_date, birth_time = excluded.birth_time, time_precision = excluded.time_precision,
           time_window = excluded.time_window, dst_choice = excluded.dst_choice, place_id = excluded.place_id, place_label = excluded.place_label,
           country_code = excluded.country_code, latitude = excluded.latitude, longitude = excluded.longitude, tz_iana = excluded.tz_iana, updated_at = excluded.updated_at
         returning id`,
        [user.uid, input.date, input.time, input.timePrecision, input.timeWindow, input.dstChoice, place.geoname_id, label, place.country_code, place.latitude, place.longitude, place.tz_iana, now])).rows[0];
      if (!birth) throw new Error('données de naissance non écrites');
      await tx.query('update public.charts set is_current = false where user_id = $1 and is_current', [user.uid]);
      const inserted = (await tx.query<{ id: string }>(
        `insert into public.charts (user_id, birth_data_id, chart_hash, engine_version, config_version, payload, sun_sign, moon_sign, asc_sign, computed_at)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) returning id`,
        [user.uid, birth.id, chart.chartHash, chart.engineVersion, chart.configVersion, JSON.stringify(chart), sun?.sign, moon && !moon.signUncertain ? moon.sign : null, chart.angles?.asc.sign ?? null, now])).rows[0];
      if (!inserted) throw new Error('thème non écrit');
      // Les appartenances pointent vers le nouveau thème avant toute suppression de l'ancien ;
      // les lectures des groupes concernés sont à refaire.
      await tx.query('update public.group_members set chart_id = $2, sun_sign = $3, moon_sign = $4, asc_sign = $5 where user_id = $1',
        [user.uid, inserted.id, sun?.sign, moon && !moon.signUncertain ? moon.sign : null, chart.angles?.asc.sign ?? null]);
      await tx.query('delete from public.group_readings where group_id in (select group_id from public.group_members where user_id = $1)', [user.uid]);
      return inserted.id;
    });
    return { status: 201, body: summary(chartId, chart) };
  },
});
