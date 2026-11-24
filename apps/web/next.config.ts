import { join } from 'node:path';
import type { NextConfig } from 'next';

// En-têtes de sécurité (SPEC §21.1) : politique de contenu stricte, aucun encadrement par des tiers.
const securityHeaders = [
  { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'" },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

const config: NextConfig = {
  // Les contenus versionnés (prompts, listes) vivent à la racine du dépôt et sont lus à l'exécution par l'API.
  outputFileTracingRoot: join(import.meta.dirname, '..', '..'),
  outputFileTracingIncludes: {
    '/api/**': ['../../content/**/*'],
    '/api/internal/setup': ['../../supabase/migrations/*.sql', '../../supabase/seed/geo_places.tsv.gz'],
  },
  poweredByHeader: false,
  headers: async () => [{ source: '/(.*)', headers: securityHeaders }],
};

export default config;
