# État du projet

Mis à jour : 2026-11-23, après le moteur, le socle IA, les rôles, les migrations et le socle de l'app.

## Fait
- **T-001** — Monorepo pnpm, `CLAUDE.md`, fichiers vivants, lint avec frontières entre paquets, contrôle de secrets, CI minimale, versions verrouillées.
- **T-002** — `packages/shared` : identifiants canoniques (§3) et tokens (couleurs, typographie, espacements, mouvement) avec test de contraste ; polices ; logos de l'Annexe C ; registre des fichiers (`assets.manifest.json`, 126 entrées) ; commandes `assets:placeholders`, `assets:check` (`--promote`, `--release`), `assets:build`, `assets:report` ; 100 fichiers provisoires ; `docs/ASSETS.md`.
  Vérifié dans la session : `pnpm lint`, `pnpm typecheck`, `pnpm test` (119 tests), `pnpm assets:check` passent. `pnpm assets:check --release` échoue comme attendu (93 fichiers provisoires bloquants).
- **T-004, T-005, T-010, T-011** — Moteur complet dans `packages/astro-engine` : port d'éphémérides et adaptateur `astronomy-engine`, maisons, résolution des fuseaux, `computeChart`, `computeTransits`, `computeSynastry`, `computeSky`, configuration versionnée, schémas Zod du thème dans `packages/shared`.
  Vérifié dans la session : 173 tests passent, dont la comparaison aux éphémérides de la NASA, le contrôle géométrique des angles sur 240 cas, la définition de Placidus, et la concordance des fuseaux avec la base du système.
  Limites : tolérance de 0,01° au lieu de 0,001° (ADR-012) ; essai sur Vercel non fait ; contrôle croisé humain non fait (Q-09) ; couverture de code non mesurée.
- **T-030, T-031 (socle)** — `packages/ai` : faits et libellés, sélection des six faits du roast, chaîne de validation V1 à V9, une relance, repli déterministe, typographie, jetons, `LlmPort`. Testé avec un modèle simulé.
  Reste : adaptateur du fournisseur (O-08), table `ai_usage` branchée, base de règles (T-032), évaluations (T-033), pipelines des autres contenus.
- **T-042 (calcul)** — catalogue des rôles (Annexe B), attribution optimale et déterministe, choix des duos. Reste : libellés `family` et `colleagues`, phrases de repli, prompt et route.
- **T-006 (hors projet Supabase)** — migrations, RLS, privilèges, `pnpm db:test` (52 contrôles d'isolation sur un Postgres local). Reste : projets Supabase, application des migrations, types générés, test sur l'instance Supabase.
- **T-003 (socle)** — app Expo SDK 58 : configuration (bundle `com.aurorya.app`, iPhone, portrait, sombre), profils EAS, thème et `useTheme`, textes français et anglais avec contrôle de parité, trois onglets natifs, composants `Text`, `Button`, `Screen`, `Card`, `Chip`, `EmptyState`, `Banner`, galerie de développement, garde-fou contre les couleurs, polices et chemins en dur.
  Vérifié : typecheck, lint, et export d'un bundle iOS réel (3,4 Mo) avec polices et registre.
  Non vérifié : aucune exécution sur iPhone ni simulateur (impossible ici) ; pas de test de rendu des composants (React Native Testing Library non installé) ; VoiceOver et contrastes à l'écran non contrôlés. Composants restants du §16.5 à créer avec leurs tickets.
- **T-014 (géométrie)** — repère de la roue, rayons, anti-collision des glyphes, opacité des aspects : fonctions pures testées. Reste : le dessin Skia, les interactions et la liste accessible.
- **Utilitaires serveur et contrats** — codes d'erreur de l'API, liste fermée des événements analytics, gabarit des cartes (`packages/shared`) ; journalisation en liste blanche, jetons et codes d'invitation, filtre des prénoms et noms de groupe (`apps/web/src/server`), listes de mots bloqués de départ.
- Prompts v1 de l'Annexe A dans `content/prompts/fr/`.
  Vérifié dans la session : `pnpm lint`, `pnpm typecheck`, `pnpm test` (238 tests), `pnpm db:test`, `pnpm assets:check`.
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
- Premier build iOS : exige le compte Expo et le compte développeur Apple (action humaine).
- La CI n'a jamais tourné : versions des actions GitHub non vérifiées.
- `.claude/rules/` et `.claude/agents/relecteur.md` (facultatifs) ne sont pas créés.
- `apps/web` est un squelette sans Next.js (T-008, T-009).

## Prochaine action
T-013 (onboarding) et T-014 (roue) côté app ; T-009 (socle de l'API) côté serveur, contre le Postgres local.
Ensuite, sans compte : socle de l'API (T-009) contre le Postgres local, import des lieux (T-007), base de règles (T-032, demande un fournisseur d'IA).

## Bloqué, en attente d'un fondateur
- Comptes à ouvrir : Supabase (T-006), Vercel payant (T-004, T-008, T-009), Expo/EAS (build de T-003), puis RevenueCat, Sentry, Resend, fournisseur d'IA.
- Soumission à Apple : structure juridique (O-05), domaine (O-06), disponibilité du nom (O-01), textes légaux relus.

## Pièges découverts
- Le `\\b` des expressions régulières JavaScript ignore les lettres accentuées : les lexiques de validation passent par une frontière de mot maison.
- Retirer tous les droits sur les fonctions du schéma public casse aussi celles des extensions quand elles y sont installées.
- L'environnement distant « aurorya » n'autorise que `ssd.jpl.nasa.gov` en plus des registres de paquets. `fetch` de Node ignore le proxy : utiliser curl.
- Les scripts lancés par `node` ne peuvent pas importer les sources du moteur (imports sans extension) : les mesures passent par Vitest.
- TypeScript 7.0.2 est la dernière version, mais `typescript-eslint` 8.73.0 exige `<6.1.0` : TypeScript est verrouillé en 6.0.3.
- La session distante impose la branche `claude/hopeful-fermat-ttya03`, et non `feat/T-xxx-…` (§1.5).
- Node 22 exécute directement les scripts `.ts` (types retirés à la volée) : les imports entre scripts portent l'extension `.ts`.
- sharp : composer une image sur un fond à trois canaux rajoute un canal de transparence ; il faut `removeAlpha()`.
