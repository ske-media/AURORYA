// Codes d'erreur de l'API (SPEC §13.2). L'app affiche un texte i18n choisi d'après `code`.
import { z } from 'zod';

export const API_ERRORS = {
  VALIDATION_FAILED: 400,
  UNAUTHENTICATED: 401,
  ACCOUNT_REQUIRED: 403,
  PREMIUM_REQUIRED: 403,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INVITE_INVALID: 410,
  AGE_RESTRICTED: 422,
  BIRTH_TIME_NONEXISTENT: 422,
  NAME_REJECTED: 422,
  UPDATE_REQUIRED: 426,
  RATE_LIMITED: 429,
  QUOTA_EXCEEDED: 429,
  INTERNAL: 500,
  GENERATION_UNAVAILABLE: 503,
} as const;
export type ApiErrorCode = keyof typeof API_ERRORS;
export const API_ERROR_CODES = Object.keys(API_ERRORS) as ApiErrorCode[];

export const ApiErrorSchema = z.strictObject({
  error: z.strictObject({
    code: z.enum(API_ERROR_CODES as [ApiErrorCode, ...ApiErrorCode[]]),
    /** Destiné au développeur, jamais affiché. */
    message: z.string(),
    retryable: z.boolean(),
    details: z.record(z.string(), z.unknown()),
  }),
});
export type ApiErrorBody = z.infer<typeof ApiErrorSchema>;

const RETRYABLE: readonly ApiErrorCode[] = ['RATE_LIMITED', 'INTERNAL', 'GENERATION_UNAVAILABLE'];

export const apiError = (code: ApiErrorCode, message: string, details: Record<string, unknown> = {}): { status: number; body: ApiErrorBody } => ({
  status: API_ERRORS[code],
  body: { error: { code, message, retryable: RETRYABLE.includes(code), details } },
});
