# Aurorya — règles permanentes

Source de vérité : `docs/SPEC.md`. En cas de doute, la lire. Ne jamais la contredire en silence.

## Avant de coder
1. Lire `docs/STATE.md` et les dernières entrées de `docs/DECISIONS.md`.
2. Relire les sections de `docs/SPEC.md` citées par le ticket.
3. Vérifier toute API externe dans les types installés ou la doc officielle (SPEC §1.3). La mémoire n'est pas une source.

## Lois (résumé de SPEC §1.2)
- Aucune donnée astrologique ne vient d'un LLM : tout vient de `packages/astro-engine`.
- Identifiants canoniques, tokens, textes, prix : un seul endroit, jamais recopiés.
- Pas de donnée fictive hors `__fixtures__/`. Pas d'écran qui simule.
- Lectures via Supabase + RLS. Écritures uniquement via `/api/v1/*`.
- Le client ne décide jamais des droits, quotas, prix.
- Jamais de prénom, date, heure ou lieu de naissance envoyé au fournisseur d'IA ni écrit dans un journal.
- Périmètre strict : le ticket, rien de plus.
- Statuts : [DÉCIDÉ] appliquer · [ARBITRAGE] appliquer · [OUVERT] ne pas inventer · [À VÉRIFIER] vérifier d'abord.
- S'arrêter et demander dans les cas de SPEC §1.4.
- Ne jamais dire qu'un test passe sans l'avoir exécuté, ni sans avoir lu son code de retour (jamais une sortie filtrée seule).

## Commandes
- `pnpm typecheck` · `pnpm lint` · `pnpm test`
- `pnpm --filter mobile start` · `pnpm --filter web dev`
- `pnpm db:reset` (local uniquement) · `pnpm db:types`
- `pnpm assets:check` · `pnpm assets:placeholders` · `pnpm assets:report`
- `pnpm engine:golden` (tests de référence du moteur) · `pnpm engine:golden:fetch` (retélécharge les références)
- `pnpm evals` (évaluations des prompts)

## Conventions
- TypeScript strict. Pas de `any`. Zod à chaque frontière.
- Fichiers en kebab-case, composants en PascalCase, tables et colonnes en snake_case.
- Commits : Conventional Commits, avec l'identifiant du ticket (`feat(roast): T-031 pipeline de validation`).
- Branches : `feat/T-xxx-slug`, `fix/T-xxx-slug`. Jamais de push direct sur `main`.
- Textes visibles : clés i18n, `fr` et `en` toujours ensemble.
- Fichiers visuels : uniquement via `getAsset('id')`.

## Cap produit (demande d'un fondateur, 2026-11-24)
- Toute architecture se pense pour un grand nombre d'utilisatrices : index sur chaque clé étrangère et chaque filtre, coût par utilisatrice gratuite borné, rien qui parcourt une table entière, cache pour tout ce qui coûte, fonctions sans état.
- Le modèle est le freemium avec paywall : chaque contenu naît avec sa part gratuite et sa part Premium, et c'est le serveur qui décide du droit (ADR-020).

## Autonomie et questions aux fondateurs
- Mode autonome (ADR-013) : trancher seul, enchaîner les tickets, consigner chaque décision dans `docs/DECISIONS.md`. Ne solliciter un fondateur que pour l'irréversible (loi 15), l'ouverture de comptes, une dépense ou le juridique.
- Quand une question est inévitable : questionnaire à cliquer, jamais de question en texte libre.

## Fin de ticket
Exécuter la Definition of Done (SPEC §1.6), mettre à jour `docs/STATE.md`, résumer honnêtement.

## Interdits absolus
Désactiver une politique RLS · exposer la clé `service_role` · coder un prix en dur · modifier une migration déjà appliquée · importer du code du moteur ailleurs que via son interface publique · créer ou renommer un produit App Store, un identifiant de bundle ou un nom de fichier du registre sans validation humaine.
