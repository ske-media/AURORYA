// Entrées et sorties des routes de l'API (SPEC §13.3), partagées entre le serveur et l'app.
import { z } from 'zod';
import { GRAMMATICAL_GENDERS, LOCALES, SECTION_KEYS, SIGN_IDS, TIME_PRECISIONS, TIME_WINDOWS, TONE_MODES } from '../canon';

export const INTERESTS = ['love', 'work', 'self', 'relationships'] as const;
export const ASTRO_LEVELS = ['beginner', 'intermediate', 'advanced'] as const;

export const PutProfileInputSchema = z.strictObject({
  firstName: z.string().min(1).max(60),
  grammaticalGender: z.enum(GRAMMATICAL_GENDERS),
  locale: z.enum(LOCALES).default('fr'),
  /** Fuseau IANA de l'appareil. */
  tz: z.string().min(1).max(64).default('Europe/Paris'),
  interests: z.array(z.enum(INTERESTS)).max(4).default([]),
  astroLevel: z.enum(ASTRO_LEVELS).nullable().default(null),
  toneModeDefault: z.enum(TONE_MODES).default('cash'),
});
export type PutProfileInput = z.infer<typeof PutProfileInputSchema>;

export const ProfileSchema = z.strictObject({
  id: z.string().uuid(),
  firstName: z.string(),
  grammaticalGender: z.enum(GRAMMATICAL_GENDERS),
  locale: z.enum(LOCALES),
  tz: z.string(),
  interests: z.array(z.string()),
  astroLevel: z.enum(ASTRO_LEVELS).nullable(),
  toneModeDefault: z.enum(TONE_MODES),
});
export type Profile = z.infer<typeof ProfileSchema>;

/** Le lieu est désigné par son identifiant : coordonnées et fuseau ne viennent jamais du client (SPEC §21.1). */
export const PostChartsInputSchema = z.strictObject({
  placeId: z.number().int().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).nullable(),
  timePrecision: z.enum(TIME_PRECISIONS),
  timeWindow: z.enum(TIME_WINDOWS).nullable(),
  dstChoice: z.enum(['first', 'second']).nullable().default(null),
});
export type PostChartsInput = z.infer<typeof PostChartsInputSchema>;

const sign = z.enum(SIGN_IDS);
export const ChartSummarySchema = z.strictObject({
  chartId: z.string().uuid(),
  sunSign: sign,
  /** null si le signe de la Lune est incertain. */
  moonSign: sign.nullable(),
  /** null sans heure exacte. */
  ascSign: sign.nullable(),
  flags: z.strictObject({ timeAssumed: z.boolean(), dstAmbiguous: z.boolean(), houseSystemFallback: z.boolean() }),
});
export type ChartSummary = z.infer<typeof ChartSummarySchema>;

export const PostRoastsInputSchema = z.strictObject({
  chartId: z.string().uuid(),
  mode: z.enum(TONE_MODES),
  regenerate: z.boolean().default(false),
});
export type PostRoastsInput = z.infer<typeof PostRoastsInputSchema>;

export const RoastResponseSchema = z.strictObject({
  readingId: z.string().uuid(),
  mode: z.enum(TONE_MODES),
  variant: z.number().int().min(0),
  status: z.enum(['ok', 'fallback']),
  /** L'étiquette du placement est posée par le serveur, pas par le LLM. */
  punchlines: z.array(z.strictObject({ anchor: z.string(), label: z.string(), text: z.string() })).length(3),
  hooks: z.strictObject(Object.fromEntries(SECTION_KEYS.map((k) => [k, z.string()])) as Record<(typeof SECTION_KEYS)[number], z.ZodString>),
});
export type RoastResponse = z.infer<typeof RoastResponseSchema>;
