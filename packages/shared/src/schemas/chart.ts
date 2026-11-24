// Entrée et résultat du moteur (SPEC §11.4, §11.6). Ces schémas font foi.
import { z } from 'zod';
import { ASPECT_IDS, ELEMENTS, MODALITIES, PLANET_IDS, SIGN_IDS, TIME_PRECISIONS, TIME_WINDOWS } from '../canon';

const sign = z.enum(SIGN_IDS);
const planet = z.enum(PLANET_IDS);
const chartBody = z.enum([...PLANET_IDS, 'north_node']);
const aspectParty = z.enum([...PLANET_IDS, 'north_node', 'asc', 'mc']);
const house = z.number().int().min(1).max(12);
const longitude = z.number().min(0).lt(360);

export const HOUSE_SYSTEMS = ['placidus', 'porphyry'] as const;
export const MOON_PHASES = [
  'new_moon', 'waxing_crescent', 'first_quarter', 'waxing_gibbous',
  'full_moon', 'waning_gibbous', 'last_quarter', 'waning_crescent',
] as const;
export type MoonPhase = (typeof MOON_PHASES)[number];

export const BirthInputSchema = z
  .strictObject({
    /** Calendrier grégorien, « AAAA-MM-JJ ». */
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    /** « HH:MM », ou null. */
    time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).nullable(),
    timePrecision: z.enum(TIME_PRECISIONS),
    timeWindow: z.enum(TIME_WINDOWS).nullable(),
    /** Seulement en cas d'heure ambiguë (retour à l'heure d'hiver). */
    dstChoice: z.enum(['first', 'second']).nullable(),
    /** Degrés décimaux, nord et est positifs. */
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    tzIana: z.string().min(1),
    houseSystem: z.literal('placidus'),
  })
  .refine((v) => (v.timePrecision === 'exact') === (v.time !== null), { path: ['time'], message: 'heure requise si et seulement si la précision est exacte' })
  .refine((v) => (v.timePrecision === 'approx') === (v.timeWindow !== null), { path: ['timeWindow'], message: 'plage requise si et seulement si la précision est approximative' });
export type BirthInput = z.infer<typeof BirthInputSchema>;

const AnglePointSchema = z.strictObject({ longitude, sign, degree: z.number().int().min(0).max(29), minute: z.number().int().min(0).max(59) });

export const ChartBodySchema = z.strictObject({
  id: chartBody,
  longitude,
  latitude: z.number(),
  /** Degrés par jour. */
  speed: z.number(),
  sign,
  degree: z.number().int().min(0).max(29),
  minute: z.number().int().min(0).max(59),
  house: house.nullable(),
  retrograde: z.boolean(),
  signUncertain: z.boolean(),
  signCandidates: z.array(sign).nullable(),
});
export type ChartBody = z.infer<typeof ChartBodySchema>;

export const AspectSchema = z.strictObject({
  a: aspectParty,
  b: aspectParty,
  type: z.enum(ASPECT_IDS),
  /** Écart à l'exactitude, en degrés. */
  orb: z.number().min(0),
  /** null si un angle est impliqué. */
  applying: z.boolean().nullable(),
});
export type Aspect = z.infer<typeof AspectSchema>;

export const ChartPayloadSchema = z.strictObject({
  schemaVersion: z.literal(1),
  engineVersion: z.string(),
  configVersion: z.string(),
  ephemeris: z.string(),
  libraryVersion: z.string(),
  tzdataVersion: z.string(),
  chartHash: z.string().regex(/^sha256:[0-9a-f]{64}$/),
  input: z.strictObject({
    timePrecision: z.enum(TIME_PRECISIONS),
    tzIana: z.string(),
    utc: z.string(),
    utcOffsetMinutes: z.number().int(),
    julianDayUt: z.number(),
  }),
  flags: z.strictObject({ timeAssumed: z.boolean(), dstAmbiguous: z.boolean(), houseSystemFallback: z.boolean() }),
  houseSystem: z.enum(HOUSE_SYSTEMS).nullable(),
  bodies: z.array(ChartBodySchema).length(11),
  angles: z.strictObject({ asc: AnglePointSchema, mc: AnglePointSchema }).nullable(),
  houses: z.array(z.strictObject({ house, cusp: longitude, sign })).length(12).nullable(),
  aspects: z.array(AspectSchema),
  dominants: z.strictObject({
    elements: z.record(z.enum(ELEMENTS), z.number().int().min(0)),
    modalities: z.record(z.enum(MODALITIES), z.number().int().min(0)),
    chartRuler: z.strictObject({ modern: planet, traditional: planet }).nullable(),
    stelliums: z.array(z.strictObject({ kind: z.enum(['sign', 'house']), key: z.string(), bodies: z.array(planet).min(3) })),
    angular: z.array(planet),
    retrogrades: z.array(planet),
  }),
});
export type ChartPayload = z.infer<typeof ChartPayloadSchema>;
