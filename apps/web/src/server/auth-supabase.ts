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

export const createSupabaseAuth = (supabaseUrl: string): AuthPort => {
  const base = supabaseUrl.replace(/\/$/, '');
  return createJwtAuth(createRemoteJWKSet(new URL(`${base}/auth/v1/.well-known/jwks.json`)), `${base}/auth/v1`);
};
