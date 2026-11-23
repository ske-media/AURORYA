// Formes de sortie des générations (SPEC §14.5) et entrée de la base de règles (§14.3).
import { z } from 'zod';
import { SECTION_KEYS, TONE_MODES } from '../canon';

/** Identifiant stable d'un fait calculé par le moteur (SPEC §14.2). */
export const FactIdSchema = z.string().regex(/^[a-z_]+(:[a-z0-9_.-]+)+$/);
export type FactId = z.infer<typeof FactIdSchema>;

const byMode = <T extends z.ZodType>(schema: T) => z.strictObject(Object.fromEntries(TONE_MODES.map((m) => [m, schema])) as Record<(typeof TONE_MODES)[number], T>);

export const PunchlineSchema = z.strictObject({ anchor: FactIdSchema, text: z.string().min(1) });
export const RoastOutputSchema = z.strictObject({
  punchlines: z.tuple([PunchlineSchema, PunchlineSchema, PunchlineSchema]),
  hooks: z.strictObject(Object.fromEntries(SECTION_KEYS.map((k) => [k, z.string().min(1)])) as Record<(typeof SECTION_KEYS)[number], z.ZodString>),
});
export type RoastOutput = z.infer<typeof RoastOutputSchema>;

export const SectionOutputSchema = z.strictObject({ paragraphs: z.array(z.string().min(1)).min(2).max(4), anchors: z.array(FactIdSchema).min(1) });
export type SectionOutput = z.infer<typeof SectionOutputSchema>;

export const DailySignOutputSchema = z.strictObject({ headline: z.string().min(1).max(90), body: z.string().min(1).max(280) });
export type DailySignOutput = z.infer<typeof DailySignOutputSchema>;

export const KbEntrySchema = z.strictObject({
  keywords: z.array(z.string().min(1)).min(3).max(6),
  essence: z.string().min(1),
  light: z.array(z.string().min(1)).min(2).max(4),
  shadow: z.array(z.string().min(1)).min(2).max(4),
  behaviors: z.array(z.string().min(1)).min(3).max(5),
  /** Une à deux phrases, affichées telles quelles (feuille de placement). */
  summary: byMode(z.string().min(1)),
  /** Punchlines de secours, affichées telles quelles en cas de repli. */
  roastAngles: byMode(z.array(z.string().min(1)).min(1)),
  roastWeight: z.number().int().min(0).max(3),
  avoid: z.array(z.string()),
});
export type KbEntry = z.infer<typeof KbEntrySchema>;
