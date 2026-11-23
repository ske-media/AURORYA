// Journalisation en liste blanche (SPEC §21.3). Seuls les champs listés ici sortent dans les journaux :
// jamais de prénom, d'e-mail, de données de naissance, de texte généré, de jeton ni de corps de requête.
const ALLOWED_FIELDS = new Set([
  'requestId', 'route', 'method', 'status', 'durationMs', 'uid', 'isAnonymous', 'appVersion', 'appBuild', 'locale',
  'errorCode', 'failureCodes', 'feature', 'tier', 'model', 'tokensIn', 'tokensOut', 'costMicroUsd', 'outcome',
  'rateLimitKey', 'cached', 'event', 'count', 'environment',
]);

export type LogValue = string | number | boolean | null | readonly string[];

/** Ne garde que les champs autorisés, de types simples. Tout le reste est écarté, pas masqué. */
export function sanitizeLogFields(fields: Readonly<Record<string, unknown>>): Record<string, LogValue> {
  const out: Record<string, LogValue> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (!ALLOWED_FIELDS.has(key)) continue;
    if (value === null || typeof value === 'number' || typeof value === 'boolean') out[key] = value;
    else if (typeof value === 'string') out[key] = value.slice(0, 200);
    else if (Array.isArray(value) && value.every((v) => typeof v === 'string')) out[key] = value.map((v: string) => v.slice(0, 80));
  }
  return out;
}

export type LogSink = (line: string) => void;

export function createLogger(sink: LogSink = (line) => console.log(line)) {
  const write = (level: 'info' | 'warn' | 'error', message: string, fields: Readonly<Record<string, unknown>> = {}): void =>
    sink(JSON.stringify({ level, message, ...sanitizeLogFields(fields) }));
  return {
    info: (message: string, fields?: Readonly<Record<string, unknown>>) => write('info', message, fields),
    warn: (message: string, fields?: Readonly<Record<string, unknown>>) => write('warn', message, fields),
    error: (message: string, fields?: Readonly<Record<string, unknown>>) => write('error', message, fields),
  };
}
