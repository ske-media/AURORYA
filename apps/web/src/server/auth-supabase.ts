// Vérification des jetons Supabase (SPEC §13.1) : signature et expiration, puis `sub` et `is_anonymous`.
// À VÉRIFIER sur le projet réel : clés de signature asymétriques actives, émetteur et audience.
import { type JWTVerifyGetKey, createRemoteJWKSet, jwtVerify } from 'jose';
import type { AuthPort } from './deps';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function createJwtAuth(keys: JWTVerifyGetKey, issuer: string): AuthPort {
  return {
    async verify(token) {
      try {
        const { payload } = await jwtVerify(token, keys, { issuer, audience: 'authenticated', clockTolerance: 5 });
        if (typeof payload.sub !== 'string' || !UUID.test(payload.sub)) return null;
        return { uid: payload.sub, isAnonymous: payload.is_anonymous === true };
      } catch {
        return null;
      }
    },
  };
}

/**
 * Vérifie d'abord la signature localement (clés publiques du projet). Si le projet signe encore ses jetons
 * avec un secret partagé, ou si les clés sont indisponibles, la vérification est demandée à Supabase Auth.
 */
export const createSupabaseAuth = (supabaseUrl: string, publishableKey?: string, doFetch: typeof fetch = fetch): AuthPort => {
  const base = supabaseUrl.replace(/\/$/, '');
  const local = createJwtAuth(createRemoteJWKSet(new URL(`${base}/auth/v1/.well-known/jwks.json`)), `${base}/auth/v1`);
  return {
    async verify(token) {
      const verified = await local.verify(token);
      if (verified || !publishableKey) return verified;
      try {
        const response = await doFetch(`${base}/auth/v1/user`, { headers: { apikey: publishableKey, authorization: `Bearer ${token}` } });
        if (!response.ok) return null;
        const user = (await response.json()) as { id?: unknown; is_anonymous?: unknown };
        if (typeof user.id !== 'string' || !UUID.test(user.id)) return null;
        return { uid: user.id, isAnonymous: user.is_anonymous === true };
      } catch {
        return null;
      }
    },
  };
};
