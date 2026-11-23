// Dépendances injectées dans les routes : tout ce qui touche l'extérieur passe par ces ports,
// ce qui rend l'API testable sans réseau.
import type { LlmPort, RoastPrompts, RoleCatalog } from '@aurorya/ai';
import type { EngineConfig } from '@aurorya/astro-engine';
import type { createLogger } from './log';

export type SqlRow = Record<string, unknown>;
/** Connexion Postgres côté serveur (rôle de service). */
export interface Sql {
  query<T extends SqlRow = SqlRow>(text: string, params?: readonly unknown[]): Promise<{ rows: T[]; rowCount: number }>;
  /** Exécute `work` dans une transaction ; annule tout si elle lève. */
  transaction<T>(work: (tx: Sql) => Promise<T>): Promise<T>;
}

export type AuthUser = Readonly<{ uid: string; isAnonymous: boolean }>;
export interface AuthPort {
  /** Vérifie la signature et l'expiration du jeton Supabase. Null s'il est absent ou invalide. */
  verify(token: string): Promise<AuthUser | null>;
}

export type OutgoingEmail = Readonly<{ kind: 'waitlist_confirm'; to: string; locale: 'fr' | 'en'; confirmToken: string; unsubToken: string }>;

export type AppDeps = Readonly<{
  sql: Sql;
  auth: AuthPort;
  logger: ReturnType<typeof createLogger>;
  now: () => Date;
  /** Null quand aucun fournisseur d'IA n'est configuré (O-08) : tout est servi par repli. */
  llm: LlmPort | null;
  prompts: Readonly<Record<'fr' | 'en', Readonly<Record<'soft' | 'cash' | 'expert', RoastPrompts>>>>;
  engineConfig: EngineConfig;
  /** Catalogue des rôles de groupe (content/roles). */
  roleCatalog: RoleCatalog;
  /** Adresse publique du site, pour les liens d'invitation. Null tant que le domaine n'existe pas (O-06). */
  publicSiteUrl: string | null;
  /** Envoi d'e-mails (Resend). Absent tant que le service n'est pas configuré : l'inscription est enregistrée sans envoi. */
  sendEmail?: (email: OutgoingEmail) => Promise<void>;
  nameFilter: { firstName(input: string): string | null; groupName(input: string): string | null };
}>;
