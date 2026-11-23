// Démarre un Postgres jetable pour les tests de l'API : imitation minimale de Supabase, puis migrations.
import { execFileSync } from 'node:child_process';
import { chownSync, existsSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir, userInfo } from 'node:os';
import { join, resolve } from 'node:path';
import type { TestProject } from 'vitest/node';

const PORT = '54330';

function findBin(): string {
  const root = '/usr/lib/postgresql';
  const versions = existsSync(root) ? readdirSync(root).sort((a, b) => Number(b) - Number(a)) : [];
  for (const version of versions) if (existsSync(join(root, version, 'bin', 'initdb'))) return join(root, version, 'bin');
  throw new Error('Postgres introuvable : les tests de l’API ont besoin de initdb et pg_ctl.');
}

export default function setup(project: TestProject): () => void {
  const bin = findBin();
  const work = mkdtempSync(join(tmpdir(), 'aurorya-pg-'));
  const asRoot = userInfo().uid === 0;
  if (asRoot) chownSync(work, Number(execFileSync('id', ['-u', 'postgres'], { encoding: 'utf8' }).trim()), 0);
  // Sortie ignorée : le serveur Postgres hérite des canaux de pg_ctl, et un canal ouvert bloquerait l'appel.
  const run = (command: string, args: string[]): void => {
    if (asRoot) execFileSync('runuser', ['-u', 'postgres', '--', command, ...args], { stdio: 'ignore' });
    else execFileSync(command, args, { stdio: 'ignore' });
  };
  const data = join(work, 'data');
  run(join(bin, 'initdb'), ['-D', data, '-U', 'postgres', '--auth=trust']);
  run(join(bin, 'pg_ctl'), ['-D', data, '-o', `-p ${PORT} -c listen_addresses='' -k ${work}`, '-l', join(work, 'postgres.log'), '-w', 'start']);
  const psql = (file: string): void => void execFileSync('psql', ['-X', '-q', '-v', 'ON_ERROR_STOP=1', '-h', work, '-p', PORT, '-U', 'postgres', '-d', 'postgres', '-f', file], { stdio: 'pipe' });
  const root = resolve(import.meta.dirname, '../../..');
  psql(join(root, 'supabase/tests/00_supabase_shim.sql'));
  const migrations = join(root, 'supabase/migrations');
  for (const file of readdirSync(migrations).sort()) psql(join(migrations, file));
  project.provide('pg', { host: work, port: Number(PORT) });
  return () => {
    try {
      run(join(bin, 'pg_ctl'), ['-D', data, '-m', 'immediate', 'stop']);
    } finally {
      rmSync(work, { recursive: true, force: true });
    }
  };
}

declare module 'vitest' {
  export interface ProvidedContext {
    pg: { host: string; port: number };
  }
}
