# Versions verrouillées et vérifications

Protocole : SPEC §1.3. Aucune plage flottante (`.npmrc` : `save-exact=true`).

## Outils (vérifiés le 2026-11-23)

| Paquet | Version | Licence | Source de la vérification | Remarques |
|---|---|---|---|---|
| Node.js | 22.x (22.23.5 installé) | MIT | `node -v` | `engines` : `>=22.13.0 <23`, exigé par ESLint 10 et Vitest 5. |
| pnpm | 10.28.0 | MIT | `pnpm -v` | Version installée et éprouvée. La 12.23.0 existe ; migration non évaluée. |
| typescript | 6.0.3 | Apache-2.0 | registre npm | La 7.0.2 existe mais `typescript-eslint` 8.73.0 exige `<6.1.0`. |
| eslint | 10.15.0 | MIT | registre npm | Configuration plate (`eslint.config.js`). |
| @eslint/js | 10.0.1 | MIT | registre npm | |
| typescript-eslint | 8.73.0 | MIT | registre npm, `peerDependencies` | Pourquoi : règles `no-explicit-any` et `ban-ts-comment` (loi 13). |
| globals | 17.14.0 | MIT | registre npm | Globales Node pour les scripts. |
| vitest | 5.1.1 | MIT | registre npm | Un seul lanceur à la racine. |
| @types/node | 22.20.5 | MIT | registre npm | Aligné sur Node 22. |

## Relevé, pas encore installé

| Paquet | Dernière version stable relevée | À vérifier au ticket |
|---|---|---|
| expo | 58.0.26 | T-003 : compatibilité de chaque module natif. |
| next | 16.4.6 | T-008. |
| react | 19.3.1 | T-003 : version exigée par le SDK Expo retenu. |
| zod | 4.6.7 | T-002. |

## Non vérifié
- Versions des actions GitHub de la CI (`actions/checkout@v4`, `pnpm/action-setup@v4`, `actions/setup-node@v4`).
- Syntaxe `permissions.deny` de `.claude/settings.json` : écrite d'après la documentation de Claude Code, pas éprouvée dans cette session.
