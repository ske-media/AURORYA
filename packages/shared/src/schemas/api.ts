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

// ——— Groupes (SPEC §13.4) ———
export const GROUP_MAX_MEMBERS = 8;

export const PostGroupsInputSchema = z.strictObject({ name: z.string().min(1).max(80), type: z.enum(['friends', 'couple', 'family', 'colleagues']) });
export const PatchGroupInputSchema = z.strictObject({ name: z.string().min(1).max(80) });
export const GroupSchema = z.strictObject({
  id: z.string().uuid(), name: z.string(), type: z.enum(['friends', 'couple', 'family', 'colleagues']), ownerId: z.string().uuid(), membersCount: z.number().int(),
});
export type Group = z.infer<typeof GroupSchema>;

export const InviteCreatedSchema = z.strictObject({
  inviteId: z.string().uuid(),
  /** Renvoyé une seule fois : seule son empreinte est conservée. */
  token: z.string(),
  code: z.string(),
  expiresAt: z.string(),
  /** null tant que le domaine n'est pas configuré (O-06). */
  url: z.string().nullable(),
});
export const InvitePreviewSchema = z.strictObject({
  inviterFirstName: z.string(), groupName: z.string(), groupType: z.enum(['friends', 'couple', 'family', 'colleagues']), valid: z.boolean(),
});
export const ResolveInviteInputSchema = z.strictObject({ code: z.string().min(1).max(20) });
export const JoinGroupInputSchema = z
  .strictObject({
    token: z.string().min(1).max(64).optional(),
    code: z.string().min(1).max(20).optional(),
    displayName: z.string().min(1).max(60),
    /** Consentement explicite au partage du prénom et des trois signes (SPEC §7.6). */
    consentGroupShare: z.literal(true),
    consentVersion: z.string().min(1).max(20),
  })
  .refine((v) => (v.token === undefined) !== (v.code === undefined), { path: ['token'], message: 'jeton ou code, l’un des deux' });

export const PostGroupReadingInputSchema = z.strictObject({ kind: z.enum(['roles_duos', 'weekly_weather']), mode: z.enum(TONE_MODES) });
export const GroupReadingSchema = z.strictObject({
  kind: z.literal('roles_duos'),
  /** « structure » : rôles et duos calculés, textes pas encore rédigés (aucun fournisseur d'IA). */
  status: z.enum(['ok', 'fallback', 'structure']),
  roles: z.array(z.strictObject({ userId: z.string().uuid(), displayName: z.string(), roleId: z.string(), label: z.string(), line: z.string().nullable(), detail: z.string().nullable(), locked: z.boolean() })),
  duos: z.array(z.strictObject({ kind: z.enum(['duo_fusion', 'duo_sparks']), a: z.string().uuid(), b: z.string().uuid(), title: z.string().nullable(), line: z.string().nullable(), detail: z.string().nullable(), locked: z.boolean() })),
});
export type GroupReading = z.infer<typeof GroupReadingSchema>;
