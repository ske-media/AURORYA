// Contrôle minimal de fuite de secrets (SPEC §21.1), exécuté par `pnpm lint` et la CI.
// Analyse les fichiers suivis par git. Un outil dédié pourra le remplacer (docs/OPEN_QUESTIONS.md).
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';

const PATTERNS = [
  ['clé privée', /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ['jeton JWT', /\beyJ[A-Za-z0-9_-]{15,}\.eyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{10,}/],
  ['clé de type sk-', /\bsk-[A-Za-z0-9_-]{24,}/],
  ['clé Supabase secrète', /\bsb_secret_[A-Za-z0-9_-]{16,}/],
  ['jeton GitHub', /\bgh[pousr]_[A-Za-z0-9]{30,}/],
  ['clé AWS', /\bAKIA[0-9A-Z]{16}\b/],
  ['clé Resend', /\bre_[A-Za-z0-9]{8,}_[A-Za-z0-9]{16,}/],
];
const SKIP = /\.(jpg|jpeg|png|webp|ttf|otf|wav|ico|lock)$|pnpm-lock\.yaml$/i;

const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], { encoding: 'utf8' })
  .split('\n')
  .filter(Boolean);

const problems = [];
for (const file of files) {
  const name = basename(file);
  if (/^\.env(\..+)?$/.test(name) && name !== '.env.example') {
    problems.push(`${file} : fichier d'environnement suivi par git`);
    continue;
  }
  if (SKIP.test(file)) continue;
  let text;
  try {
    text = readFileSync(file, 'utf8');
  } catch {
    continue;
  }
  if (name === '.env.example') {
    for (const line of text.split('\n')) {
      if (/^[A-Z0-9_]+=.+/.test(line)) problems.push(`${file} : une valeur est renseignée (${line.split('=')[0]})`);
    }
  }
  for (const [label, re] of PATTERNS) {
    if (re.test(text)) problems.push(`${file} : ${label} détecté`);
  }
}

if (problems.length > 0) {
  console.error('Secrets potentiels détectés :\n' + problems.map((p) => `  - ${p}`).join('\n'));
  process.exit(1);
}
console.log(`check-secrets : ${files.length} fichiers analysés, aucun secret détecté.`);
