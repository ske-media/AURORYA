# État du projet

Mis à jour : 2026-11-23, fin de T-002.

## Fait
- **T-001** — Monorepo pnpm, `CLAUDE.md`, fichiers vivants, lint avec frontières entre paquets, contrôle de secrets, CI minimale, versions verrouillées.
- **T-002** — `packages/shared` : identifiants canoniques (§3) et tokens (couleurs, typographie, espacements, mouvement) avec test de contraste ; polices ; logos de l'Annexe C ; registre des fichiers (`assets.manifest.json`, 126 entrées) ; commandes `assets:placeholders`, `assets:check` (`--promote`, `--release`), `assets:build`, `assets:report` ; 100 fichiers provisoires ; `docs/ASSETS.md`.
  Vérifié dans la session : `pnpm lint`, `pnpm typecheck`, `pnpm test` (119 tests), `pnpm assets:check` passent. `pnpm assets:check --release` échoue comme attendu (93 fichiers provisoires bloquants).
- `docs/SPEC.md` : copie à l'octet près du texte fourni par le fondateur.

## Écarts et limites de T-002
- `Manrope-SemiBold.ttf` : aucun fichier statique n'est publié ; c'est une instance (graisse 600) tirée de la police variable officielle. Consigné au registre.
- Icônes d'interface : reprises de Lucide (ISC), trait ramené à 1,5.
- `favicon.svg` garde le repère 200 × 200 du logo (affiché en 32 × 32) au lieu d'un viewBox 32 × 32.
- Captures de l'App Store : dimensions provisoires 1290 × 2796, à vérifier à la soumission.
- `assets:check --promote` n'est pas interactif : il demande de renseigner `source` et `license` dans le registre, puis de relancer.
- `registry.generated.ts` utilise `require()` : il passe le typecheck mais n'a pas encore tourné dans un bundler (pas d'Expo avant T-003).
- Les schémas Zod partagés, la mise en page des cartes (`card-layout`) et les événements analytics de `packages/shared` arrivent avec leurs tickets.
- Les couleurs ajoutées (ADR-011) et la correction du thème clair (ADR-010) sont proposées, pas validées.

## Non fait depuis T-001
- La CI n'a jamais tourné : versions des actions GitHub non vérifiées.
- `.claude/rules/` et `.claude/agents/relecteur.md` (facultatifs) ne sont pas créés.
- `apps/mobile` et `apps/web` sont des squelettes sans Expo ni Next.js.

## Prochaine action
T-003 (app Expo : navigation, thème, i18n, composants de base, galerie) puis T-004 (moteur, voie C).
T-003 peut démarrer sans compte ; un build iOS exigera le compte Expo.

## Bloqué, en attente d'un fondateur
- Comptes à ouvrir : Supabase (T-006), Vercel payant (T-004, T-008, T-009), Expo/EAS (build de T-003), puis RevenueCat, Sentry, Resend, fournisseur d'IA.
- Soumission à Apple : structure juridique (O-05), domaine (O-06), disponibilité du nom (O-01), textes légaux relus.

## Pièges découverts
- TypeScript 7.0.2 est la dernière version, mais `typescript-eslint` 8.73.0 exige `<6.1.0` : TypeScript est verrouillé en 6.0.3.
- La session distante impose la branche `claude/hopeful-fermat-ttya03`, et non `feat/T-xxx-…` (§1.5).
- Node 22 exécute directement les scripts `.ts` (types retirés à la volée) : les imports entre scripts portent l'extension `.ts`.
- sharp : composer une image sur un fond à trois canaux rajoute un canal de transparence ; il faut `removeAlpha()`.
