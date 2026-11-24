import { readFileSync } from 'node:fs';
import { RoleCatalogSchema } from '@aurorya/ai';
import { DEFAULT_ENGINE_CONFIG } from '@aurorya/astro-engine';
import rolesJson from '../../../../content/roles/roles.v1.json';
import { SignJWT, createLocalJWKSet, exportJWK, generateKeyPair } from 'jose';
import { afterAll, beforeEach, describe, expect, inject, it } from 'vitest';
import mobileFr from '../../../mobile/src/i18n/locales/fr/common.json';
import { createJwtAuth, createSupabaseAuth } from './auth-supabase';
import type { AppDeps, OutgoingEmail } from './deps';
import { createLogger } from './log';
import { createNameFilter } from './names';
import { createPgSql } from './pg-sql';
import { buildRoastPrompts, stripFrontMatter } from './prompts';
import { invalidateConfigCache } from './remote-config';
import { confirmWaitlist, postWaitlist, unsubscribeWaitlist } from './waitlist';

const roleCatalog = RoleCatalogSchema.parse(rolesJson);
const root = new URL('../../../../content/', import.meta.url);
const read = (path: string): string | null => {
  try { return readFileSync(new URL(path, root), 'utf8'); } catch { return null; }
};

describe('vérification des jetons', async () => {
  const ISSUER = 'https://projet.invalid/auth/v1';
  const { publicKey, privateKey } = await generateKeyPair('ES256');
  const auth = createJwtAuth(createLocalJWKSet({ keys: [{ ...(await exportJWK(publicKey)), kid: 'k1', alg: 'ES256' }] }), ISSUER);
  const uid = '00000000-0000-4000-8000-00000000abcd';
  const sign = (claims: Record<string, unknown>, options: { issuer?: string; audience?: string; expires?: string; key?: CryptoKey } = {}) =>
    new SignJWT(claims).setProtectedHeader({ alg: 'ES256', kid: 'k1' }).setIssuer(options.issuer ?? ISSUER).setAudience(options.audience ?? 'authenticated')
      .setIssuedAt().setExpirationTime(options.expires ?? '1h').sign(options.key ?? privateKey);

  it('accepte un jeton valide et distingue la session anonyme', async () => {
    expect(await auth.verify(await sign({ sub: uid, is_anonymous: true }))).toEqual({ uid, isAnonymous: true });
    expect(await auth.verify(await sign({ sub: uid }))).toEqual({ uid, isAnonymous: false });
  });
  it('refuse un jeton expiré, mal signé, d’un autre émetteur, d’une autre audience ou sans identifiant', async () => {
    const other = await generateKeyPair('ES256');
    expect(await auth.verify(await sign({ sub: uid }, { expires: '-1h' }))).toBeNull();
    expect(await auth.verify(await sign({ sub: uid }, { key: other.privateKey }))).toBeNull();
    expect(await auth.verify(await sign({ sub: uid }, { issuer: 'https://autre.invalid/auth/v1' }))).toBeNull();
    expect(await auth.verify(await sign({ sub: uid }, { audience: 'anon' }))).toBeNull();
    expect(await auth.verify(await sign({ sub: 'pas-un-uuid' }))).toBeNull();
    expect(await auth.verify('n’importe quoi')).toBeNull();
  });
});

describe('vérification déléguée à Supabase Auth', () => {
  const uid = '00000000-0000-4000-8000-00000000abcd';
  const make = (status: number, body: unknown) => {
    const calls: { url: string; headers: Record<string, string> }[] = [];
    const auth = createSupabaseAuth('https://projet.invalid/', 'cle-publique', (async (url: string, init: { headers: Record<string, string> }) => {
      if (url.includes('jwks')) throw new Error('clés indisponibles');
      calls.push({ url, headers: init.headers });
      return new Response(JSON.stringify(body), { status });
    }) as unknown as typeof fetch);
    return { auth, calls };
  };
  it('accepte un jeton que Supabase reconnaît', async () => {
    const { auth, calls } = make(200, { id: uid, is_anonymous: true });
    expect(await auth.verify('jeton')).toEqual({ uid, isAnonymous: true });
    expect(calls[0]).toEqual({ url: 'https://projet.invalid/auth/v1/user', headers: { apikey: 'cle-publique', authorization: 'Bearer jeton' } });
  });
  it('refuse un jeton que Supabase rejette, ou une réponse sans identifiant', async () => {
    expect(await make(401, {}).auth.verify('jeton')).toBeNull();
    expect(await make(200, { id: 'x' }).auth.verify('jeton')).toBeNull();
  });
});

describe('autorité épinglée de la base', async () => {
  const { X509Certificate, createHash } = await import('node:crypto');
  const { SUPABASE_ROOT_CA_PEM, SUPABASE_ROOT_CA_SHA256 } = await import('./supabase-ca');
  const { poolConfigFromUrl } = await import('./pg-sql');
  it('correspond à l’empreinte relevée et reste une autorité racine valide', () => {
    const cert = new X509Certificate(SUPABASE_ROOT_CA_PEM);
    expect(createHash('sha256').update(cert.raw).digest('hex')).toBe(SUPABASE_ROOT_CA_SHA256);
    expect(cert.ca).toBe(true);
    expect(cert.verify(cert.publicKey)).toBe(true);
    expect(cert.subject).toContain('Supabase Root 2021 CA');
  });
  it('vérifie toujours le certificat hors base locale', () => {
    expect(poolConfigFromUrl('postgresql://u:p@aws-0-eu-central-1.pooler.supabase.com:6543/postgres', SUPABASE_ROOT_CA_PEM).ssl).toMatchObject({ rejectUnauthorized: true });
    expect(poolConfigFromUrl('postgresql://u:p@exemple.invalid:5432/db').ssl).toEqual({ rejectUnauthorized: true });
    expect(poolConfigFromUrl('postgresql://u@localhost:5432/db').ssl).toBeUndefined();
  });
});

describe('prompts', () => {
  const prompts = buildRoastPrompts((path) => read(`prompts/${path}`), 'Ava');
  it('assemble identité, sécurité, méthode, style et tâche, avec le prénom de l’astrologue', () => {
    const system = prompts.fr.cash.system;
    expect(system).toContain('Tu es Ava, l\'astrologue d\'Aurorya');
    expect(system).not.toContain('{{persona_name}}');
    expect(system).not.toMatch(/^---/m);
    for (const marker of ['Règles absolues', 'Méthode :', 'Mode Mars', 'Écris le roast']) expect(system).toContain(marker);
    expect(system.indexOf('Règles absolues')).toBeLessThan(system.indexOf('Mode Mars'));
    expect(prompts.fr.expert.system).toContain('Mode Saturne');
    expect(prompts.fr.soft.judgeSystem).toContain('Tu contrôles un texte');
  });
  it('donne une version différente à chaque assemblage, stable d’un appel à l’autre', () => {
    const versions = [prompts.fr.soft, prompts.fr.cash, prompts.fr.expert].map((p) => p.promptVersion);
    expect(new Set(versions).size).toBe(3);
    expect(buildRoastPrompts((path) => read(`prompts/${path}`), 'Ava').fr.cash.promptVersion).toBe(prompts.fr.cash.promptVersion);
    expect(buildRoastPrompts((path) => read(`prompts/${path}`), 'Autre').fr.cash.promptVersion).not.toBe(prompts.fr.cash.promptVersion);
  });
  it('retire l’en-tête des fichiers et échoue si un prompt manque', () => {
    expect(stripFrontMatter('---\nid: x\n---\nTexte')).toBe('Texte');
    expect(() => buildRoastPrompts(() => null, 'Ava')).toThrow();
  });
  it('le prénom de l’astrologue est le même côté serveur et côté app', () => {
    expect(JSON.parse(read('brand.json') ?? '{}').personaName).toBe(mobileFr.persona.name);
  });
});

describe('liste d’attente', () => {
  const pg = inject('pg');
  const { sql, close } = createPgSql({ host: pg.host, port: pg.port, user: 'postgres', database: 'postgres' });
  const sent: OutgoingEmail[] = [];
  const logs: string[] = [];
  const deps: AppDeps = {
    sql, auth: { verify: async () => null }, logger: createLogger((l) => logs.push(l)), now: () => new Date('2026-11-23T10:00:00Z'), llm: null,
    prompts: {} as AppDeps['prompts'], engineConfig: DEFAULT_ENGINE_CONFIG, roleCatalog, deleteAuthUser: async (uid) => void (await sql.query('delete from auth.users where id = $1', [uid])), publicSiteUrl: null, nameFilter: createNameFilter([]),
    sendEmail: async (email) => void sent.push(email),
  };
  const post = (body: unknown, ip = '203.0.113.7') =>
    postWaitlist(new Request('https://test.invalid/api/v1/waitlist', { method: 'POST', body: JSON.stringify(body), headers: { 'x-forwarded-for': ip } }), deps);
  const page = (token: string) => new Request(`https://test.invalid/?token=${token}`);
  afterAll(close);
  beforeEach(async () => {
    sent.length = 0;
    logs.length = 0;
    await sql.query('truncate public.rate_limits');
    invalidateConfigCache(sql);
  });

  it('exige une adresse valide et un consentement explicite', async () => {
    expect((await post({ email: 'pas-une-adresse', consent: true })).status).toBe(400);
    expect((await post({ email: 'lea@example.com', consent: false })).status).toBe(400);
    expect((await post({ email: 'lea@example.com' })).status).toBe(400);
    expect(sent).toHaveLength(0);
  });
  it('inscrit, envoie la confirmation, puis confirme et désinscrit par jeton', async () => {
    const response = await post({ email: ' Lea@Example.com ', consent: true, sunSign: 'aries' });
    expect(response.status).toBe(202);
    expect(sent).toHaveLength(1);
    const row = async () => (await sql.query<{ email: string; confirmed_at: Date | null; unsubscribed_at: Date | null; sun_sign: string }>(`select email, confirmed_at, unsubscribed_at, sun_sign from public.waitlist where email = 'lea@example.com'`)).rows[0];
    expect(await row()).toMatchObject({ email: 'lea@example.com', confirmed_at: null, sun_sign: 'aries' });
    expect(await confirmWaitlist(deps, page('faux'))).toBe(false);
    expect(await confirmWaitlist(deps, page(sent[0]?.confirmToken ?? ''))).toBe(true);
    expect((await row())?.confirmed_at).not.toBeNull();
    expect(await confirmWaitlist(deps, page(sent[0]?.confirmToken ?? ''))).toBe(false);
    expect(await unsubscribeWaitlist(deps, page(sent[0]?.unsubToken ?? ''))).toBe(true);
    expect((await row())?.unsubscribed_at).not.toBeNull();
  });
  it('répond de la même façon pour une adresse déjà inscrite, sans renvoyer d’e-mail', async () => {
    expect((await post({ email: 'lea@example.com', consent: true })).status).toBe(202);
    expect(sent).toHaveLength(0);
  });
  it('n’écrit jamais l’adresse dans les journaux et limite le débit par adresse IP', async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 6; i += 1) statuses.push((await post({ email: `invitee${'abcdef'[i]}@example.com`, consent: true }, '203.0.113.9')).status);
    expect(statuses).toEqual([202, 202, 202, 202, 202, 429]);
    expect(logs.join('\n')).not.toContain('example.com');
  });
  it('se ferme par drapeau distant', async () => {
    await sql.query(`update public.remote_config set value = 'false' where key = 'flags.waitlist_enabled'`);
    invalidateConfigCache(sql);
    expect((await post({ email: 'zoe@example.com', consent: true })).status).toBe(403);
    await sql.query(`update public.remote_config set value = 'true' where key = 'flags.waitlist_enabled'`);
  });
});
