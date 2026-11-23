// Socle des routes de l'API (SPEC §13.1, §13.2) : identifiant de requête, garde de version,
// authentification, validation par schéma, limite de débit, erreurs typées, journalisation filtrée.
// Fonctions sur Request et Response standards : indépendantes du framework qui les expose.
import { type ApiErrorCode, apiError } from '@aurorya/shared';
import { z } from 'zod';
import type { AppDeps, AuthUser } from './deps';
import { configValue } from './remote-config';

const MAX_BODY_BYTES = 32 * 1024;

export class ApiFailure extends Error {
  constructor(readonly code: ApiErrorCode, message: string, readonly details: Record<string, unknown> = {}, readonly headers: Record<string, string> = {}) {
    super(message);
  }
}

export type RouteContext<I, A extends 'required' | 'none'> = Readonly<{
  deps: AppDeps;
  user: A extends 'required' ? AuthUser : AuthUser | null;
  input: I;
  params: Readonly<Record<string, string>>;
  requestId: string;
  locale: 'fr' | 'en';
}>;

export type RouteDefinition<I, O, A extends 'required' | 'none'> = Readonly<{
  name: string;
  auth: A;
  input?: z.ZodType<I>;
  /** Limite de débit par utilisatrice (ou par adresse IP sans authentification). */
  rateLimit?: { configKey: string; fallback: number; windowSeconds: number };
  handler: (ctx: RouteContext<I, A>) => Promise<{ status?: number; body: O }>;
}>;

const json = (status: number, body: unknown, headers: Record<string, string> = {}): Response =>
  new Response(body === null ? null : JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', ...headers } });

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function defineRoute<I, O, A extends 'required' | 'none'>(definition: RouteDefinition<I, O, A>) {
  return async (request: Request, deps: AppDeps, params: Readonly<Record<string, string>> = {}): Promise<Response> => {
    const startedAt = deps.now().getTime();
    const headerId = request.headers.get('x-request-id') ?? '';
    const requestId = UUID.test(headerId) ? headerId : crypto.randomUUID();
    const locale = request.headers.get('x-locale') === 'en' ? 'en' : 'fr';
    let uid: string | null = null;
    let isAnonymous: boolean | null = null;
    const finish = (response: Response, errorCode?: string): Response => {
      deps.logger.info('requête', {
        requestId, route: definition.name, method: request.method, status: response.status,
        durationMs: deps.now().getTime() - startedAt, uid, isAnonymous, appBuild: request.headers.get('x-app-build'),
        appVersion: request.headers.get('x-app-version'), locale, ...(errorCode ? { errorCode } : {}),
      });
      response.headers.set('x-request-id', requestId);
      return response;
    };

    try {
      // Garde de version : une app trop ancienne doit se mettre à jour.
      const build = Number(request.headers.get('x-app-build'));
      const minBuild = await configValue(deps.sql, deps.now(), 'app.min_build', z.number().int(), 1);
      if (request.headers.has('x-app-build') && Number.isFinite(build) && build < minBuild) throw new ApiFailure('UPDATE_REQUIRED', 'version de l’app trop ancienne');

      let user: AuthUser | null = null;
      const authorization = request.headers.get('authorization') ?? '';
      if (authorization.startsWith('Bearer ')) user = await deps.auth.verify(authorization.slice(7));
      if (definition.auth === 'required' && !user) throw new ApiFailure('UNAUTHENTICATED', 'jeton absent ou invalide');
      uid = user?.uid ?? null;
      isAnonymous = user?.isAnonymous ?? null;

      if (definition.rateLimit) {
        const limit = await configValue(deps.sql, deps.now(), definition.rateLimit.configKey, z.number().int().positive(), definition.rateLimit.fallback);
        const subject = user ? `uid:${user.uid}` : `ip:${(request.headers.get('x-forwarded-for') ?? 'inconnue').split(',')[0]?.trim()}`;
        const { rows } = await deps.sql.query<{ hit: boolean }>('select public.rate_limit_hit($1, $2, $3) as hit', [`${definition.name}:${subject}`, limit, definition.rateLimit.windowSeconds]);
        if (rows[0]?.hit) throw new ApiFailure('RATE_LIMITED', 'trop de requêtes', {}, { 'retry-after': String(definition.rateLimit.windowSeconds) });
      }

      let input = undefined as I;
      if (definition.input) {
        const raw = await request.text();
        if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) throw new ApiFailure('VALIDATION_FAILED', 'corps trop volumineux');
        let parsedJson: unknown;
        try {
          parsedJson = raw.length > 0 ? JSON.parse(raw) : {};
        } catch {
          throw new ApiFailure('VALIDATION_FAILED', 'JSON invalide');
        }
        const parsed = definition.input.safeParse(parsedJson);
        // Seuls les noms des champs fautifs sont renvoyés, jamais leurs valeurs.
        if (!parsed.success) throw new ApiFailure('VALIDATION_FAILED', 'entrée invalide', { fields: [...new Set(parsed.error.issues.map((i) => i.path.join('.') || '(racine)'))] });
        input = parsed.data;
      }

      const result = await definition.handler({ deps, user: user as RouteContext<I, A>['user'], input, params, requestId, locale });
      const status = result.status ?? 200;
      return finish(json(status, status === 204 ? null : result.body));
    } catch (error) {
      if (error instanceof ApiFailure) {
        const { status, body } = apiError(error.code, error.message, error.details);
        return finish(json(status, body, error.headers), error.code);
      }
      deps.logger.error('erreur interne', { requestId, route: definition.name, errorCode: 'INTERNAL' });
      const { status, body } = apiError('INTERNAL', 'erreur interne');
      return finish(json(status, body), 'INTERNAL');
    }
  };
}

/** Droit Premium d'après la table tenue à jour par le webhook RevenueCat (SPEC §18.3). Le client ne décide jamais. */
export async function isPremium(deps: AppDeps, uid: string): Promise<boolean> {
  const { rows } = await deps.sql.query<{ ok: boolean }>(
    'select (is_premium and (expires_at is null or expires_at > $2)) as ok from public.entitlements where user_id = $1', [uid, deps.now()]);
  return rows[0]?.ok === true;
}
