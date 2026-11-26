// Câblage des dépendances réelles à partir de l'environnement (SPEC §21.1 : secrets côté serveur uniquement).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { RoleCatalogSchema } from '@aurorya/ai';
import { DEFAULT_ENGINE_CONFIG } from '@aurorya/astro-engine';
import { createSupabaseAuth } from './auth-supabase';
import type { AppDeps } from './deps';
import { createRevenueCatClient } from './entitlements';
import { createLogger } from './log';
import { createNameFilter, parseBlocklist } from './names';
import { createPgSql, poolConfigFromUrl } from './pg-sql';
import { buildRoastPrompts } from './prompts';
import { SUPABASE_ROOT_CA_PEM } from './supabase-ca';

/**
 * Lit un contenu versionné (`content/`), embarqué avec le déploiement. Le chemin reste borné à ce dossier :
 * un accès dynamique plus large ferait embarquer tout le dépôt dans la fonction.
 */
const readContent = (path: string): string | null => {
  try {
    return readFileSync(join(process.cwd(), '..', '..', 'content', path), 'utf8');
  } catch {
    return null;
  }
};

const required = (name: string): string => {
  const value = process.env[name];
  if (!value) throw new Error(`Variable d'environnement manquante : ${name}`);
  return value;
};

let cached: AppDeps | null = null;

export function getDeps(): AppDeps {
  if (cached) return cached;
  const brand = JSON.parse(readContent('brand.json') ?? '{}') as { personaName?: string };
  if (!brand.personaName) throw new Error('content/brand.json : personaName manquant');
  const blocklist = ['fr', 'en'].flatMap((locale) => parseBlocklist(readContent(`blocklist/${locale}.txt`) ?? ''));
  cached = {
    sql: createPgSql(poolConfigFromUrl(required('DATABASE_URL'), process.env.DATABASE_CA_CERT ?? SUPABASE_ROOT_CA_PEM)).sql,
    auth: createSupabaseAuth(required('SUPABASE_URL'), process.env.SUPABASE_PUBLISHABLE_KEY),
    logger: createLogger(),
    now: () => new Date(),
    // Aucun fournisseur d'IA tant que O-08 n'est pas tranché : les roasts sont servis par repli.
    llm: null,
    prompts: buildRoastPrompts((path) => readContent(`prompts/${path}`), brand.personaName),
    engineConfig: DEFAULT_ENGINE_CONFIG,
    roleCatalog: RoleCatalogSchema.parse(JSON.parse(readContent('roles/roles.v1.json') ?? '{}')),
    publicSiteUrl: process.env.PUBLIC_SITE_URL?.replace(/\/$/, '') || null,
    nameFilter: createNameFilter(blocklist),
    revenueCat: process.env.REVENUECAT_SECRET_KEY ? createRevenueCatClient(process.env.REVENUECAT_SECRET_KEY) : null,
    revenueCatWebhookSecret: process.env.REVENUECAT_WEBHOOK_SECRET || null,
    deleteAuthUser: async (uid) => {
      // API d'administration de Supabase Auth, avec la clé de service (côté serveur uniquement).
      const response = await fetch(`${required('SUPABASE_URL').replace(/\/$/, '')}/auth/v1/admin/users/${uid}`, {
        method: 'DELETE', headers: { apikey: required('SUPABASE_SERVICE_ROLE_KEY'), authorization: `Bearer ${required('SUPABASE_SERVICE_ROLE_KEY')}` },
      });
      if (!response.ok && response.status !== 404) throw new Error(`suppression du compte refusée (${response.status})`);
    },
  };
  return cached;
}

type Handler = (request: Request, deps: AppDeps, params?: Readonly<Record<string, string>>) => Promise<Response>;

/** Enveloppe d'une route pour Next.js : résout les paramètres dynamiques et injecte les dépendances. */
export const expose = (handler: Handler) =>
  async (request: Request, context: { params: Promise<Record<string, string>> }): Promise<Response> =>
    handler(request, getDeps(), await context.params);
