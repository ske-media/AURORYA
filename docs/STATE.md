# État du projet

Mis à jour : 2026-11-23, après l'API complète des groupes, le site, l'onboarding, la roue et les contenus.

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
- **T-009, T-012, T-033 (route)** — socle de l'API (`defineRoute`), configuration distante avec cache de 60 s, `GET /config`, `PUT /profile`, `POST /charts`, `POST /roasts` (cache, verrou, régénération Premium, repli, nouvelle tentative après dix minutes, `ai_usage`). 33 tests de contrat contre un Postgres réel avec les migrations.
  Reste : enveloppes Next.js, adaptateur d'authentification Supabase, adaptateur du fournisseur d'IA, chargement des prompts depuis `content/prompts`, coût des appels.
- Prompts v1 de l'Annexe A dans `content/prompts/fr/`.
  Vérifié dans la session : `pnpm lint`, `pnpm typecheck`, `pnpm test` (257 tests), `pnpm db:test`, `pnpm assets:check`.
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

## Ajouts du 2026-11-23 (suite, mode autonome)
- **Groupes (T-040, T-042)** : toutes les routes (création, invitation par lien et code, adhésion avec consentement, départ, transfert) et la lecture « rôles et duos » en structure déterministe. Écrans : onglet des groupes et détail.
- **Site et API sous Next.js (T-008)** : enveloppes de toutes les routes, vérification des jetons, liste d'attente avec confirmation et désinscription, page d'invitation, en-têtes de sécurité. `next build` réussit.
- **App (T-013, T-014, T-036)** : onboarding en cinq écrans, calcul, révélation du roast avec changement de mode, roue Skia interactive et liste accessible, onglet du jour. Le bundle iOS s'exporte (5,9 Mo).
- **Contenus (T-032 partiel)** : 156 fiches et 120 questions (ADR-017), importables par `pnpm kb:seed` et `pnpm questions:seed`.
- **Bout en bout** : avec les vraies fiches, un roast de repli valide sort dans les trois modes pour quatre thèmes différents, sans fournisseur d'IA.
- **Compte (T-051, T-050 partiel)** : export et suppression du compte côté serveur ; écran des réglages avec création de compte par e-mail et code, et suppression en deux étapes. La conversion du compte anonyme (`updateUser` puis `verifyOtp` de type `email_change`) est écrite d'après les types de la bibliothèque, jamais exécutée contre Supabase. Connexion avec Apple non faite.
  Vérifié : `pnpm lint`, `pnpm typecheck`, `pnpm test` (323 tests), `pnpm db:test`, export du bundle iOS, `next build`.

## Non fait ou non vérifié
- Aucun écran n'a tourné sur un iPhone ou un simulateur. Aucun test de rendu de composant.
- Connexion avec Apple, paywall et RevenueCat, notifications, horoscopes générés, météo du groupe, membres fantômes, animation de l'aurore, feuille de placement détaillée, reste des réglages (notifications, sons, données de naissance).
- Textes des rôles et des duos (aucun fournisseur d'IA), libellés des rôles « famille » et « collègues », mini-roast par signe du site, pages légales.
- Envoi d'e-mails (Resend), notifications distantes, tâches planifiées, Sentry, Mixpanel.
- Les textes d'interface (onboarding, groupes, site) sont fonctionnels et rédigés par le développement : à relire par le design.
- La CI n'a jamais tourné.

## Lecture complète (T-035, 2026-11-24)
- Route `GET /api/v1/readings/sections/{key}?mode=` : sans droit Premium, accroche et `locked: true` seulement ; avec le droit, section écrite une fois puis servie depuis le cache (ADR-022). Cinq tests de contrat contre Postgres.
- Le texte est pour l'instant le repli de la base de règles (statut `fallback`), plus court que la cible de la SPEC : la génération par IA attend le choix du fournisseur (O-08) et le prompt `section.md`.
- App : cartes des huit sections sous la roue, écran d'une section, zone floutée Skia. Sans droit, pas de bouton « Lire la suite » tant que le paywall n'existe pas. Rien de cela n'a été vu sur un appareil.
- Pas encore en production : le travail est sur la branche `claude/hopeful-fermat-ttya03`, à fusionner par une nouvelle PR.

## Carte partageable (T-034, 2026-11-24)
- Écran `share/roast` : carte 360 × 640 d'après le gabarit, option « Masquer mon prénom », partage et enregistrement de l'image (ADR-023). Accessible depuis la révélation et depuis « Mon ciel ».
- Vérifié : typage, lint, quatre tests du contenu de la carte, export du bundle iOS. **Non vérifié : tout ce qui est natif** (capture, feuille de partage, autorisation photo), faute d'appareil. Trois nouveaux modules natifs : il faut un nouveau build de développement.
- Le runbook du premier build gagne une variable facultative : `EXPO_PUBLIC_SITE_HOST`.

## TestFlight par GitHub Actions (2026-11-24)
- Voie retenue par un fondateur : pas de compte Expo, build sur un Mac de GitHub (ADR-024). Workflow `iOS TestFlight` écrit, **jamais exécuté** : il attend quatre secrets Apple et la fiche de l'app dans App Store Connect (`docs/runbooks/premier-build.md`, § 3 bis).
- Vérifié ici : `expo prebuild` produit le projet Xcode avec l'équipe, le numéro de build et le texte d'autorisation photo attendus.
- PR n°2 fusionnée : cache, lecture complète et carte partageable sont en production.

## Premier build TestFlight (2026-11-24)
- Build n°3 compilé sur un Mac de GitHub, signé par Apple et envoyé à App Store Connect à 08:00 UTC (workflow `iOS TestFlight`). Deux échecs corrigés avant : aucun appareil sur le compte (archive désormais sans signature, signature de distribution à l'export), fiche de l'app absente au moment de l'envoi.
- Fiche de l'app créée par un fondateur (identifiant Apple 6838627506) ; textes et catégories posés par l'API (ADR-025).
- Non vérifié : le lancement de l'app sur un iPhone.

## Compte Apple (2026-11-24)
- Clé d'API App Store Connect fournie par un fondateur et vérifiée en lecture. Identifiant d'app `com.aurorya.app` **enregistré chez Apple** (définitif), avec l'accord du fondateur par questionnaire.
- Restent à la main : créer la fiche de l'app dans App Store Connect, poser le secret GitHub `ASC_KEY_P8`.
- Le compte n'a aucun appareil enregistré : risque pour la signature à l'archive, à voir au premier build.
- La clé a été transmise dans la conversation : à régénérer une fois le premier build passé.

## Mise en ligne (2026-11-24)
- **Vercel** : projet `aurorya` créé dans l'équipe SKE, relié au dépôt, racine `apps/web`, Node 22, région `fra1`. Premier déploiement réussi depuis la branche `claude/hopeful-fermat-ttya03` ; la page d'accueil répond avec ses en-têtes de sécurité. Aucune variable d'environnement n'est encore posée : les routes de l'API échouent tant que la base n'existe pas.
- **Protection des déploiements** : active sur les adresses `*.vercel.app` (connexion Vercel exigée). L'app mobile ne peut pas appeler l'API sans nom de domaine relié au projet ou sans lever cette protection.
- **Lieux (T-007)** : `pnpm geo:build` et `pnpm geo:load` ; 162 367 villes avec noms français et anglais, recherche vérifiée sur données réelles en base locale.
- **TestFlight** : rien n'a été envoyé. Marche à suivre complète dans `docs/runbooks/premier-build.md`.

## Base de production (2026-11-24)
- Projet Supabase `glvtyivmnrniwguenwaf` (Francfort), créé par un fondateur. Via la route interne de mise en place (ADR-019) : sept migrations appliquées, 22 tables toutes sous RLS, 156 fiches, 120 questions, 162 367 lieux, 26 clés de configuration.
- Vercel : `DATABASE_URL` (pooler `aws-1-eu-central-1`, mode transaction), `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` posées pour production et aperçus. `INTERNAL_SETUP_KEY` neutralisée après usage (les déploiements déjà construits gardent l'ancienne valeur jusqu'au prochain déploiement).
- Non vérifié : aucun appel authentifié n'a encore traversé l'API réelle (il faut l'app, ou un jeton Supabase). Les connexions anonymes doivent être activées dans Supabase par un fondateur.
- Manquent sur Vercel : `SUPABASE_SERVICE_ROLE_KEY` (suppression de compte) et `PUBLIC_SITE_URL` (liens d'invitation), à poser quand l'adresse de production sera connue.

## Prochaine action
1. Fondateur : activer les connexions anonymes dans Supabase ; changer le mot de passe de la base (communiqué en clair) ; fournir la clé `service_role` par un canal sûr.
2. Ouvrir et fusionner une PR pour la branche de travail (cache ADR-021, lecture complète T-035) : la production (`https://aurorya.vercel.app`) tourne encore sur l'état de la PR n°1.
3. Fondateur : build de développement iOS avec les trois variables `EXPO_PUBLIC_*` du runbook.

## Bloqué, en attente d'un fondateur
- Comptes à ouvrir : Supabase (T-006), Vercel payant (T-004, T-008, T-009), Expo/EAS (build de T-003), puis RevenueCat, Sentry, Resend, fournisseur d'IA.
- Soumission à Apple : structure juridique (O-05), domaine (O-06), disponibilité du nom (O-01), textes légaux relus.

## Pièges découverts
- **Typecheck faussement vert (2026-11-23 et 24)** : `pnpm -s typecheck | head` masque la sortie d'erreur des paquets et son code de retour. Le typecheck a échoué sans être vu entre l'ajout des tests de contenus et le correctif du 24 ; les comptes rendus qui l'annonçaient vert sur cette période étaient faux. Toujours lire le code de retour (`echo $?`) d'une commande de vérification, jamais seulement sa sortie filtrée.
- TypeScript 6 n'inclut plus automatiquement les types de `@types` : un paquet dont les tests lisent des fichiers doit déclarer `"types": ["node"]`.
- `pg_ctl start` lancé depuis Node avec une sortie en tube bloque indéfiniment : le serveur hérite du tube. Utiliser `stdio: 'ignore'`.
- La base de règles pèse dans le choix des faits du roast : un test qui fabrique une sortie de LLM doit utiliser la même base que le serveur.
- Le `\\b` des expressions régulières JavaScript ignore les lettres accentuées : les lexiques de validation passent par une frontière de mot maison.
- Retirer tous les droits sur les fonctions du schéma public casse aussi celles des extensions quand elles y sont installées.
- L'environnement distant « aurorya » n'autorise que `ssd.jpl.nasa.gov` en plus des registres de paquets. `fetch` de Node ignore le proxy : utiliser curl.
- Les scripts lancés par `node` ne peuvent pas importer les sources du moteur (imports sans extension) : les mesures passent par Vitest.
- TypeScript 7.0.2 est la dernière version, mais `typescript-eslint` 8.73.0 exige `<6.1.0` : TypeScript est verrouillé en 6.0.3.
- La session distante impose la branche `claude/hopeful-fermat-ttya03`, et non `feat/T-xxx-…` (§1.5).
- Node 22 exécute directement les scripts `.ts` (types retirés à la volée) : les imports entre scripts portent l'extension `.ts`.
- sharp : composer une image sur un fond à trois canaux rajoute un canal de transparence ; il faut `removeAlpha()`.
