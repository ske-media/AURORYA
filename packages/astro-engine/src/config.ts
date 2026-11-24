// Configuration versionnée du moteur (SPEC §11.5). Valeurs à faire valider par l'astrologue relectrice (O-14).
import { ASPECT_IDS, PLANET_IDS, SIGN_IDS } from '@aurorya/shared';
import { z } from 'zod';
import raw from '../config/engine-config.v1.json';

const orbs = z.strictObject(Object.fromEntries(ASPECT_IDS.map((id) => [id, z.number().positive()])) as Record<(typeof ASPECT_IDS)[number], z.ZodNumber>);
const planet = z.enum(PLANET_IDS);
const rulers = z.record(z.enum(SIGN_IDS), planet);
const weight = z.strictObject({ harmony: z.number().int().min(0), tension: z.number().int().min(0) });

export const EngineConfigSchema = z.strictObject({
  configVersion: z.string(),
  zodiac: z.literal('tropical'),
  houseSystem: z.literal('placidus'),
  houseSystemFallback: z.literal('porphyry'),
  polarLatitudeThreshold: z.number(),
  node: z.literal('true'),
  natalOrbs: orbs,
  luminaryBonus: z.number(),
  pointOrbFactor: z.number(),
  transitOrbs: orbs,
  synastryOrbs: orbs,
  skyOrb: z.number(),
  angularOrb: z.number(),
  stelliumMinBodies: z.number().int().min(2),
  rulers: z.strictObject({ modern: rulers, traditional: rulers }),
  transitRanking: z.strictObject({ slowBodies: z.array(planet), personalPoints: z.array(z.enum([...PLANET_IDS, 'asc', 'mc'])) }),
  synastryWeights: z.strictObject({
    aspects: z.strictObject({ trine: weight, sextile: weight, square: weight, opposition: weight, conjunction: weight, conjunctionHard: weight }),
    hardConjunctionBodies: z.array(planet),
    softeningBodies: z.array(planet),
    personalBodies: z.array(z.enum([...PLANET_IDS, 'asc'])),
    personalWeight: z.number().int().min(1),
  }),
});
export type EngineConfig = z.infer<typeof EngineConfigSchema>;

export const DEFAULT_ENGINE_CONFIG: EngineConfig = EngineConfigSchema.parse(raw);
