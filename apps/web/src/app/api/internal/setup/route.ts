// Route interne de mise en place (docs/runbooks/premier-build.md). Inactive tant que INTERNAL_SETUP_KEY
// n'est pas définie : retirer la variable après usage désactive la route.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { safeEqual } from '@/server/invites';
import { getDeps } from '@/server/runtime';
import { readPostgresTlsChain } from '@/server/tls-chain';
import { SETUP_STEPS, type SetupFiles, type SetupStep, runSetupStep } from '@/server/setup';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

const root = (...parts: string[]): string => join(process.cwd(), '..', '..', ...parts);
const json = (file: string): Record<string, never> => JSON.parse(readFileSync(file, 'utf8')) as Record<string, never>;
const maybe = <T>(read: () => T, fallback: T): T => {
  try { return read(); } catch { return fallback; }
};

function loadFiles(): SetupFiles {
  const migrationsDir = root('supabase', 'migrations');
  const kbDir = root('content', 'kb');
  const questionsDir = root('content', 'questions');
  const kb: Record<string, Record<string, unknown>> = {};
  for (const locale of maybe(() => readdirSync(kbDir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name), [])) {
    kb[locale] = Object.assign({}, ...readdirSync(join(kbDir, locale)).filter((f) => f.endsWith('.json')).sort().map((f) => json(join(kbDir, locale, f))));
  }
  const questions: Record<string, Record<string, string[]>> = {};
  for (const file of maybe(() => readdirSync(questionsDir).filter((f) => f.endsWith('.json')), [])) questions[file.replace('.json', '')] = json(join(questionsDir, file));
  return {
    migrations: readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort().map((f) => [f, readFileSync(join(migrationsDir, f), 'utf8')] as const),
    kb, kbVersion: '1', questions,
    geoGz: maybe(() => readFileSync(root('supabase', 'seed', 'geo_places.tsv.gz')), null),
  };
}

export async function GET(request: Request): Promise<Response> {
  const expected = process.env.INTERNAL_SETUP_KEY;
  const url = new URL(request.url);
  if (!expected || expected.length < 24 || !safeEqual(url.searchParams.get('key') ?? '', expected)) return new Response(null, { status: 404 });
  const step = url.searchParams.get('step') ?? '';
  if (step === 'tls-chain') {
    // Diagnostic : chaîne de certificats du serveur de base, pour renseigner DATABASE_CA_CERT.
    try {
      const target = new URL(process.env.DATABASE_URL ?? '');
      return Response.json({ step, result: await readPostgresTlsChain(target.hostname, Number(target.port || 5432)) });
    } catch (error) {
      return Response.json({ step, error: error instanceof Error ? error.message : 'erreur inconnue' }, { status: 500 });
    }
  }
  if (!(SETUP_STEPS as readonly string[]).includes(step)) return Response.json({ error: 'étape inconnue', steps: SETUP_STEPS }, { status: 400 });
  try {
    return Response.json({ step, result: await runSetupStep(getDeps().sql, step as SetupStep, loadFiles()) });
  } catch (error) {
    // Message de l'erreur de base renvoyé à l'opératrice : aucune donnée personnelle ne transite par cette route.
    return Response.json({ step, error: error instanceof Error ? error.message : 'erreur inconnue' }, { status: 500 });
  }
}
