// Frontière avec le fournisseur d'IA (SPEC §14.1). Changer de fournisseur ou de modèle est une
// modification de configuration. La sortie est toujours structurée par le mécanisme natif du fournisseur.
import type { AiTier, Result } from '@aurorya/shared';
import type { z } from 'zod';

export type TokenUsage = Readonly<{ tokensIn: number; tokensOut: number }>;
export type LlmError = Readonly<{ code: 'TIMEOUT' | 'RATE_LIMITED' | 'PROVIDER_ERROR' | 'INVALID_OUTPUT' | 'DISABLED'; detail?: string }>;

export type LlmRequest<T> = Readonly<{
  tier: AiTier;
  /** Prompt système assemblé. */
  system: string;
  /** Données de la requête, en JSON. Ne contient jamais de prénom, de date, d'heure ni de lieu. */
  user: string;
  schema: z.ZodType<T>;
  maxOutputTokens: number;
  temperature: number;
  requestId: string;
}>;

export interface LlmPort {
  generateStructured<T>(request: LlmRequest<T>): Promise<Result<{ data: T; usage: TokenUsage; model: string }, LlmError>>;
}
