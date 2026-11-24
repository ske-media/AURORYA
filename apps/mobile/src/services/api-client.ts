// Client de l'API (SPEC §15.3) : jeton, en-têtes, validation des réponses par les schémas partagés,
// erreurs converties en `ApiError` portant un `code`. Aucun appel réseau ailleurs dans l'app.
import { type ApiErrorCode, ApiErrorSchema } from '@aurorya/shared';
import type { z } from 'zod';

export class ApiError extends Error {
  constructor(readonly code: ApiErrorCode | 'NETWORK' | 'INVALID_RESPONSE', readonly status: number, readonly details: Record<string, unknown> = {}) {
    super(code);
  }
}

export type ApiClientOptions = Readonly<{
  baseUrl: string;
  appVersion: string;
  appBuild: string;
  getToken: () => Promise<string | null>;
  getLocale: () => 'fr' | 'en';
  newRequestId: () => string;
  fetch?: typeof fetch;
  /** Appelé sur 426 : l'app affiche l'écran de mise à jour. */
  onUpdateRequired?: () => void;
  sleep?: (ms: number) => Promise<void>;
}>;

export type ApiRequest<O> = Readonly<{
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  body?: unknown;
  output: z.ZodType<O> | null;
  /** Clé d'idempotence d'une création : une relance réutilise la même clé. */
  idempotencyKey?: string;
}>;

const READ_RETRIES = 2;

export function createApiClient(options: ApiClientOptions) {
  const doFetch = options.fetch ?? fetch;
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));

  async function once<O>(request: ApiRequest<O>): Promise<O> {
    const token = await options.getToken();
    let response: Response;
    try {
      response = await doFetch(`${options.baseUrl}${request.path}`, {
        method: request.method,
        headers: {
          ...(token ? { authorization: `Bearer ${token}` } : {}),
          ...(request.body !== undefined ? { 'content-type': 'application/json' } : {}),
          ...(request.idempotencyKey ? { 'idempotency-key': request.idempotencyKey } : {}),
          'x-app-version': options.appVersion,
          'x-app-build': options.appBuild,
          'x-locale': options.getLocale(),
          'x-request-id': options.newRequestId(),
        },
        ...(request.body !== undefined ? { body: JSON.stringify(request.body) } : {}),
      });
    } catch {
      throw new ApiError('NETWORK', 0);
    }
    if (response.status === 204) return undefined as O;
    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new ApiError('INVALID_RESPONSE', response.status);
    }
    if (!response.ok) {
      const parsed = ApiErrorSchema.safeParse(payload);
      if (!parsed.success) throw new ApiError('INVALID_RESPONSE', response.status);
      if (parsed.data.error.code === 'UPDATE_REQUIRED') options.onUpdateRequired?.();
      throw new ApiError(parsed.data.error.code, response.status, parsed.data.error.details);
    }
    if (request.output === null) return undefined as O;
    const parsed = request.output.safeParse(payload);
    if (!parsed.success) throw new ApiError('INVALID_RESPONSE', response.status);
    return parsed.data;
  }

  return {
    /** Seules les lectures sont relancées d'office : deux fois, avec une attente croissante. */
    async request<O>(request: ApiRequest<O>): Promise<O> {
      const retries = request.method === 'GET' ? READ_RETRIES : 0;
      for (let attempt = 0; ; attempt += 1) {
        try {
          return await once(request);
        } catch (error) {
          const retryable = error instanceof ApiError && (error.code === 'NETWORK' || error.status >= 500);
          if (!retryable || attempt >= retries) throw error;
          await sleep(400 * 2 ** attempt);
        }
      }
    },
  };
}
export type ApiClient = ReturnType<typeof createApiClient>;
