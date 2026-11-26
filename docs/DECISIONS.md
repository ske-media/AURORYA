# Journal des décisions

Format : SPEC §1.7. Les entrées ne sont jamais réécrites : on en ajoute une qui remplace.
Les entrées ci-dessous viennent des réponses d'un fondateur au questionnaire de la session du 2026-11-23.

## ADR-001 — Moteur de calcul : bibliothèque sous licence permissive (2026-11-23)
Statut : accepté
Contexte : O-04. Swiss Ephemeris impose l'AGPL sur tout le projet ou une licence professionnelle à 700 CHF (SPEC §11.1).
Décision : voie C. Le moteur s'appuie sur une bibliothèque d'astronomie sous licence permissive, avec un calcul des maisons écrit en interne. Swiss Ephemeris n'est pas utilisé.
Conséquences : remplace D-029 et l'ordre de préférence du §11.2. `EphemerisPort` (§11.3) reste l'interface. T-004 devient : choisir la bibliothèque (licence, précision, nœud vrai, vitesses, couverture 1900 à aujourd'hui), l'éprouver dans une fonction Vercel, écrire Placidus et son repli. La source des valeurs de référence du §11.8 est à redéfinir (OPEN_QUESTIONS Q-01). Le champ `ephemeris` du thème et la mention « Swiss Ephemeris » de l'Annexe D sont à adapter. Le poste de 700 CHF sort du budget (§25).
Validé par : fondateur, en session.

## ADR-002 — Calendrier : soumission à Apple au plus vite, périmètre réduit (2026-11-23)
Statut : accepté
Contexte : O-10. Le fondateur veut publier le plus tôt possible ; une publication en une semaine avec tout le périmètre n'est pas tenable (aucun compte ouvert, structure juridique en cours, délai d'examen d'Apple).
Décision : viser une première version examinable soumise à Apple dès que possible, avec la qualité complète de la SPEC sur un périmètre réduit : onboarding, thème, roast, carte partageable, groupes « rôles + duos ».
Conséquences : remplace le calendrier du §23 et D-003. La date de publication dépend d'Apple, de la structure juridique (O-05), du domaine (O-06) et des textes légaux relus. Le reste du périmètre du §4.3 suit dans des versions ultérieures. Le contenu exact de la première soumission (roue, compte, abonnements) reste à préciser (OPEN_QUESTIONS Q-02).
Validé par : fondateur, en session.

## ADR-003 — Identifiant de bundle iOS : `com.aurorya.app` (2026-11-23)
Statut : accepté
Contexte : O-07.
Décision : `com.aurorya.app`.
Conséquences : définitif après publication. T-003 débloqué.
Validé par : fondateur, en session.

## ADR-004 — Prénom de l'astrologue IA : Ava (2026-11-23)
Statut : accepté
Contexte : O-02. La valeur provisoire « Élya » n'était pas validée.
Décision : `persona.name` vaut « Ava ».
Conséquences : toujours via la clé i18n, jamais en dur. Disponibilité du prénom comme marque non vérifiée.
Validé par : fondateur, en session.

## ADR-005 — Offre fondatrice : 29,99 € par an (2026-11-23)
Statut : accepté
Contexte : O-03.
Décision : prix annuel de référence de `aurorya.premium.annual.founder` : 29,99 € (zone euro).
Conséquences : T-061 débloqué. La création du produit dans App Store Connect reste soumise à confirmation (loi 15).
Validé par : fondateur, en session.

## ADR-006 — Page d'attente avec formulaire (2026-11-23)
Statut : accepté
Contexte : O-11.
Décision : la page d'attente est mise en ligne avec le formulaire ; `flags.waitlist_enabled` vaut vrai.
Conséquences : T-008 inchangé.
Validé par : fondateur, en session.

## ADR-007 — Direction visuelle : cosmique lumineux maîtrisé (2026-11-23)
Statut : accepté
Contexte : le fondateur a fourni dix références (`docs/design/inspiration/`), dont sept contredisent le §16.1 (violet, lueurs, dégradés).
Décision :
- Référence principale : `ref-01` et `ref-06` (roue lumineuse au centre, grande serif dorée, cartes sous la roue).
- Palette : la base bleu nuit, ivoire, champagne reste. Un violet profond et désaturé s'ajoute pour les fonds et les surfaces, jamais comme accent.
- Lueurs : halos doux réservés au centre de la roue, au bouton principal, à l'animation de l'aurore et à un fond nébuleux léger.
- Illustrations : photos de lune, de ciel étoilé et de nébuleuses, avec glyphes en trait fin. Elles remplacent les gravures anciennes.
- Restent proscrits : violet saturé, néon, dégradés multicolores, illustrations plates à figures humaines, scores en pourcentage, esthétique de jeu mobile.
Conséquences : modifie §16.1 et §16.2 (nouvelles couleurs de base et rôle de halo, validés par le test de contraste), remplace D-026, et transforme la famille `engraving-*` du registre (§17.5) en famille de photos célestes, dont les identifiants sont à valider à T-002 avant création. Chaque photo doit avoir une origine et une licence consignées (§17.6). Les références servent d'ambiance : aucun écran ni élément de marque tiers n'est reproduit.
Validé par : fondateur, en session.

## ADR-008 — Première soumission : compte et abonnements inclus (2026-11-23)
Statut : accepté
Contexte : ADR-002 laissait ouvert le contenu exact de la première soumission à Apple (Q-02).
Décision : la première soumission comprend aussi la création de compte et les abonnements.
Conséquences : périmètre de la première soumission = onboarding, thème, roast, carte, groupes « rôles + duos », compte (Apple, e-mail), suppression de compte, abonnements avec paywall et restauration. Les tickets T-050, T-051 et T-060 passent sur le chemin de la première soumission. La roue reste à préciser.
Validé par : fondateur, en session.

## ADR-009 — Registre : la famille `photo-*` remplace `engraving-*` (2026-11-23)
Statut : accepté
Contexte : ADR-007 remplace les gravures par des photos célestes ; les identifiants du registre sont définitifs (loi 15).
Décision : même structure que la famille prévue au §17.5, sous le préfixe `photo-` : `photo-sign-{12 signes}` (1200 × 1200), `photo-body-{10 planètes}` (800 × 800), `photo-group-{4 types}` (1200 × 800), `photo-scene-{8 scènes}` (1200 × 1200), dans `apps/mobile/assets/photos/`. Format webp avec transparence, 400 Ko au plus, non teintable. Le genre `engraving` du registre devient `photo`.
Conséquences : le composant `EngravingImage` du §16.5 sera nommé `PhotoImage`. Le registre gagne aussi un genre `web` pour les fichiers du site.
Validé par : fondateur, en session (« Entendu »).

## ADR-010 — Thème clair : `onAccent` passe à `midnight` (2026-11-23)
Statut : proposé
Contexte : la valeur proposée par le §16.2 (ivoire sur `champagneDeep`) donne un contraste de 3,47:1, sous le seuil de 4,5:1 exigé pour un libellé de bouton. Le §16.2 précise que le thème clair n'est valide que si le test de contraste passe.
Décision : `lightColors.onAccent` vaut `midnight` (4,77:1).
Conséquences : sans effet au lancement (thème sombre seul, D-024). À confirmer par le design avant la V1.1.
Validé par : en attente.

## ADR-011 — Couleurs ajoutées pour la direction d'ADR-007 (2026-11-23)
Statut : proposé
Contexte : ADR-007 demande un violet profond en second plan et des halos ciblés ; aucune valeur n'était fixée.
Décision : palette `aubergine` `#1B1830` et `nebula` `#3B3360` ; rôles `backdrop`, `backdropTint` (fond nébuleux) et `glow` (halo, `rgba(233,214,172,0.35)` en thème sombre). Tous les textes et éléments graphiques passent le test de contraste sur ces fonds.
Conséquences : valeurs choisies par le développement, à ajuster par le design sans toucher au code des composants.
Validé par : en attente.

## ADR-012 — Moteur : bibliothèque `astronomy-engine`, tolérance de 0,01° (2026-11-23)
Statut : accepté
Contexte : ADR-001 retient une bibliothèque sous licence permissive. Mesure faite contre les éphémérides DE441 de la NASA (JPL Horizons) sur 48 instants de 1900 à 2030 : écart maximal en longitude de 2 à 5″ (Soleil, Lune, Mars, Pluton), 8 à 10″ (Mercure, Vénus, Jupiter, Saturne), 12 à 18″ (Uranus, Neptune). La SPEC §11.8 demandait 0,001° (3,6″).
Décision : `astronomy-engine` 2.1.19 (MIT) derrière `EphemerisPort`. Maisons (Placidus, repli Porphyre) et nœud vrai écrits en interne. Tolérance des tests de référence : 0,01° (36″) sur les positions, au lieu de 0,001°. Fuseaux : `@js-joda/timezone` 3.2.1 (BSD-3-Clause, base IANA 2026f embarquée). Références : fichier `horizons.v1.json`, produit par `pnpm engine:golden:fetch` qui enregistre chaque requête ; l'outil de Swiss Ephemeris n'est pas utilisé.
Conséquences : aucun effet sur les signes, maisons et aspects, sauf naissance dans les heures entourant un changement de signe d'une planète lente (jusqu'à environ 19 h pour Neptune). La minute affichée peut différer d'une unité d'un site de référence. La fiche App Store et la note aux examinateurs ne doivent pas revendiquer un « moteur d'éphémérides de référence » (Annexe D à adapter). Amélioration possible sans toucher au reste : lire les éphémérides publiques du JPL dans un autre adaptateur du port (OPEN_QUESTIONS Q-08). Temps de calcul mesuré : 0,8 ms par thème à chaud, 30 ms au premier appel. L'essai dans une fonction Vercel reste à faire (pas de compte).
Validé par : décision prise en mode autonome (ADR-013), à confirmer par un fondateur.

## ADR-013 — Mode autonome (2026-11-23)
Statut : accepté
Contexte : le fondateur demande que le développement se poursuive seul jusqu'au bout, sans validation intermédiaire.
Décision : Claude Code tranche lui-même les points ouverts et les ambiguïtés, enchaîne les tickets sans attendre de validation de plan, et consigne chaque décision ici avec la mention « mode autonome ». Restent soumis à un humain : les actions irréversibles de la loi 15 (produits App Store, envoi à Apple, migration destructive, suppression de données), l'ouverture de comptes, tout engagement de dépense, et ce qui relève du juriste.
Conséquences : remplace, pour la durée de cette consigne, l'attente de validation du §1.5 étape 4 et l'arrêt systématique du §1.4 sur les points non irréversibles.
Validé par : fondateur, en session.

## ADR-014 — Détails de calcul fixés par le développement (2026-11-23)
Statut : accepté (mode autonome), à faire relire par l'astrologue (O-14)
Contexte : la SPEC §11.5 et §11.7 laisse plusieurs règles implicites.
Décision :
- Longitudes arrondies à 10⁻⁶ degré dans le thème ; signe, degré et minute déduits de la valeur arrondie.
- Deux angles (Ascendant, Milieu du Ciel) ne forment pas d'aspect entre eux.
- Corps angulaire : planète à moins de `angularOrb` de l'un des quatre angles.
- Stelliums et dominantes : les dix planètes seulement (pas le nœud) ; un corps au signe incertain est ignoré.
- Maîtrises modernes et traditionnelles, classement des transits et poids de synastrie : tables dans `engine-config.v1.json`. En synastrie, le nœud et le Milieu du Ciel sont exclus ; une conjonction impliquant Mars, Saturne, Uranus ou Pluton sans Vénus ni Jupiter compte comme tension.
- `computeTransits` renvoie `{ hits, moon }` au lieu d'une simple liste, pour porter le climat lunaire.
- Ciel du jour : orbe de 2° (`skyOrb`), changement de signe détecté entre 00:00 et 24:00 UTC.
Validé par : mode autonome.

## ADR-015 — Base de données : migrations testées sur un Postgres local, privilèges explicites (2026-11-23)
Statut : accepté (mode autonome)
Contexte : aucun projet Supabase n'existe encore (T-006), mais les migrations et les politiques RLS peuvent être écrites et éprouvées.
Décision : sept migrations reprennent le SQL de la SPEC §12 à l'identique, complétées par l'activation de la RLS partout, les politiques de lecture, `search_places`, `rate_limit_hit`, les vues d'exploitation et la configuration distante initiale. Les privilèges par défaut de Supabase sont retirés aux rôles clients, puis la lecture est accordée table par table ; `group_members.chart_id` et `group_invites.token_hash` sont exclus par des droits de colonne. `pnpm db:test` applique le tout sur un Postgres jetable muni d'une imitation minimale de Supabase (rôles, `auth.uid()`) et exécute 52 contrôles d'isolation.
Conséquences : les migrations ne sont appliquées à aucun projet réel et restent modifiables jusqu'à leur première application. À vérifier sur Supabase : schéma des extensions (`extensions`), publication Realtime, comportement des sessions anonymes. `ai.routing` et `ai.daily_budget_microusd` ne sont pas semés (O-08, T-033). Le nom du champ de période d'essai dans les événements RevenueCat (vue `kpi_trials`) est à vérifier à T-060.
Validé par : mode autonome.

## ADR-016 — API : fonctions indépendantes du framework, accès direct à Postgres (2026-11-23)
Statut : accepté (mode autonome)
Contexte : l'API (A-001, A-002) doit être testable sans compte Supabase ni Vercel. La SPEC prévoit d'écrire « avec la clé de service ».
Décision :
- Chaque route est une fonction `(Request, dépendances) → Response` définie par `defineRoute` (identifiant de requête, garde de version, authentification, schéma Zod, limite de débit, erreurs typées, journal filtré). Les fichiers `route.ts` de Next.js ne seront que des enveloppes.
- Le serveur parle à Postgres directement (`pg`), avec un rôle de service, plutôt qu'à l'API REST de Supabase avec la clé de service. Les transactions et le verrou consultatif du §14.8 deviennent possibles, et les tests tournent contre un vrai Postgres.
- L'authentification est un port (`AuthPort`) ; l'adaptateur qui vérifie les jetons Supabase reste à écrire.
Conséquences : en production, la chaîne de connexion (via le pooler de Supabase, mode transaction) devient le secret serveur à la place de la clé de service ; à vérifier avec le projet réel. `edit_count_30d` de `birth_data` n'est pas utilisé : le quota se déduit des dates des thèmes. Le coût par appel d'IA (`cost_microusd`) est enregistré à 0 tant que la table de tarifs n'existe pas (T-033).
Validé par : mode autonome.

## ADR-017 — Contenus rédigés par IA en mode autonome (2026-11-23)
Statut : accepté (mode autonome), relecture humaine attendue
Contexte : sans base de règles, le roast n'a aucun repli ; sans questions, l'onglet du jour est vide. Aucun fournisseur d'IA n'est choisi (O-08).
Décision : 156 fiches d'interprétation françaises (dix planètes, Nœud Nord, Ascendant, Milieu du Ciel, dans les douze signes) et 120 questions du jour ont été rédigées par des agents Claude, sous contrôle d'un validateur automatique (schéma, longueurs, adresse, écriture épicène, sujets interdits, prédictions). Les fiches entrent en `draft_ai` ; les questions entrent en `approved` pour pouvoir être servies.
Conséquences : la mention « relu par une astrologue » reste interdite (O-14). Les questions n'ont pas été relues par l'associé, contrairement au §14.9. Restent à écrire : corps en maison, aspects, dominantes, stelliums, rétrogrades, transits, synastrie, contenus anglais. Les agents ont mis `roastWeight` à 0 pour Neptune et Pluton dans les signes qu'aucun adulte vivant ne porte.
Validé par : mode autonome.

## ADR-018 — App : session dans le trousseau par morceaux, sans MMKV (2026-11-23)
Statut : accepté (mode autonome)
Contexte : la SPEC §15.4 prévoit MMKV chiffré. La version actuelle de `react-native-mmkv` exige un module natif supplémentaire, invérifiable sans build iOS.
Décision : la session Supabase et le brouillon d'onboarding sont rangés dans le trousseau iOS (`expo-secure-store`), découpés en morceaux de 600 caractères. MMKV sera réévalué avec les membres fantômes.
Conséquences : aucune dépendance native hors d'Expo pour le stockage. Les lectures sont plus lentes que MMKV ; acceptable pour de petites valeurs.
Validé par : mode autonome.

## ADR-019 — Mise en place de la base par une route interne, autorité Supabase épinglée (2026-11-24)
Statut : accepté (mode autonome)
Contexte : le projet Supabase `glvtyivmnrniwguenwaf` (Francfort) a été créé par un fondateur. Ni le connecteur Supabase de la session ni le poste de travail ne peuvent l'atteindre ; seul le déploiement Vercel le peut.
Décision :
- `GET /api/internal/setup?step=…&key=…` applique les migrations (octet pour octet, une seule fois, journalisées dans `public.app_migrations`) et charge fiches, questions et lieux. La route répond 404 tant que `INTERNAL_SETUP_KEY` n'est pas définie ; la variable est retirée après usage.
- L'historique de migrations de la CLI Supabase n'est pas alimenté : `public.app_migrations` fait foi.
- La connexion à la base vérifie le certificat du serveur contre « Supabase Root 2021 CA », épinglée dans `apps/web/src/server/supabase-ca.ts` (empreinte SHA-256 `807025ad…cafa`), relevée sur la chaîne présentée par le pooler. À comparer une fois avec le certificat téléchargeable dans le tableau de bord. La vérification n'est jamais désactivée.
- Pooler du projet : `aws-1-eu-central-1.pooler.supabase.com`, port 6543 (mode transaction).
Conséquences : l'autorité expire le 26 avril 2031. `DATABASE_CA_CERT` permet de la remplacer sans changer le code. Le mot de passe de la base a été communiqué en clair dans la conversation de travail : à changer, puis mettre à jour `DATABASE_URL` sur Vercel.
Validé par : mode autonome ; projet et identifiants fournis par un fondateur.

## ADR-020 — Cap : grand nombre d'utilisatrices et freemium avec paywall (2026-11-24)
Statut : accepté
Contexte : un fondateur demande que toute l'architecture soit pensée pour un grand nombre d'utilisatrices et pour le modèle freemium avec paywall.
Décision : ces deux exigences deviennent des critères de relecture de chaque ticket (voir `CLAUDE.md`).
État au 2026-11-24 :
- En place : fonctions sans état sur Vercel ; pooler en mode transaction ; lectures directes sous RLS (l'API ne porte que les écritures et les générations) ; cache permanent des lectures, avec verrou contre la double génération ; coût par utilisatrice gratuite borné à trois roasts ; horoscopes par signe à coût fixe ; limites de débit ; index sur les clés étrangères et les filtres de purge (migration 8) ; droit Premium décidé par le serveur, déjà appliqué à la régénération, à la météo du groupe et aux contenus marqués `locked`.
- À faire avant un trafic important : budget quotidien d'IA et coupe-circuit (§14.11) ; limites de débit hors de Postgres (une écriture par requête aujourd'hui) ; purge planifiée (§12.7) ; cache HTTP des lectures publiques ; mesure de charge ; suivi des erreurs.
- À faire pour le freemium : webhook RevenueCat et table des droits alimentée, écran de paywall, verrouillage de la lecture complète, offre fondatrice, restauration des achats.
Conséquences : la migration 8 ajoute treize index, retire l'appel anonyme à `is_group_member` et déplace les extensions dans le schéma `extensions`. Elle a été appliquée en production par le connecteur Supabase et inscrite dans `public.app_migrations`. La fonction `public.rls_auto_enable()`, signalée par les conseils de sécurité, n'appartient pas au projet : elle n'a pas été touchée.
Validé par : fondateur (cap), mode autonome (mise en œuvre).

## ADR-021 — Ne jamais recalculer deux fois la même chose, sauf si le stockage coûte plus que le calcul (2026-11-24)
Statut : accepté (demande d'un fondateur)
Contexte : un fondateur demande qu'un même calcul ne soit jamais refait pour une utilisatrice, sauf si le garder coûte plus cher.
Mesures sur le moteur réel :
- 72 631 thèmes (une naissance toutes les 7 heures, 1950 à 2007) donnent 72 631 fiches de roast toutes différentes, même en arrondissant les orbes : un cache partagé entre utilisatrices ne servirait jamais pour le roast.
- Horoscope personnel du 24 novembre 2026 : 78 891 thèmes donnent 71 542 fiches distinctes, soit 9 % de partage seulement.
- Calcul d'un thème : moins d'une milliseconde ; ciel du jour : quelques millisecondes ; un appel d'IA : plusieurs secondes et un coût.
Décision :
- Tout ce qui passe par l'IA est mis en cache par utilisatrice, avec une clé qui inclut les versions du moteur, des prompts et de la base de règles : thème (empreinte `chart_hash`), roast par mode et par variante, sections et horoscope personnel à venir. Un verrou empêche deux générations simultanées de la même clé.
- Ce qui est commun à toutes est calculé une fois : horoscope par signe (36 textes par jour, quel que soit le nombre d'utilisatrices) ; ciel du jour mémorisé en mémoire par instance.
- Revenir à des données de naissance déjà saisies réactive l'ancien thème et toutes ses lectures, sans recalcul ni régénération, et sans compter dans le quota.
- Pas de cache partagé des roasts entre utilisatrices (aucun partage mesuré) ni de stockage des transits du jour (recalcul en quelques millisecondes, moins cher qu'une écriture en base).
Conséquences : la règle s'applique à chaque nouvelle génération (sections, horoscope personnel, textes des groupes). À revoir si une mesure future montre un partage significatif.
Validé par : fondateur (principe), mesures et mise en œuvre en mode autonome.

## ADR-022 — Lecture complète : route, verrou serveur, texte de repli (T-035)
Date : 2026-11-24 · Statut : appliqué
Contexte : SPEC §7.4 et §13.3. Le fournisseur d'IA n'est pas choisi (O-08) et le prompt `section.md` n'est pas écrit ; l'écran d'abonnement n'existe pas encore.
Décision :
- `GET /api/v1/readings/sections/{key}?mode=` : sans le droit `premium`, le serveur renvoie l'accroche et `locked: true`, rien d'autre ; le texte n'est ni écrit ni transmis (D-014). L'accroche vient du roast du même mode ; sans roast, 404.
- Avec le droit, la section est écrite une fois puis lue dans `readings` (`kind = full_section`). Tant qu'aucun LLM n'est branché, le texte est le repli de la base de règles : le résumé, dans le mode demandé, des faits les plus saillants de la section (deux à quatre paragraphes, statut `fallback`). Il est plus court que les 180 à 260 mots visés par la SPEC.
- Clé de cache du repli : `prompt_version = kb-1` (version du gabarit) et version de la base de règles. Le pipeline LLM des sections aura sa propre version de prompt : les replis ne masqueront pas les textes générés.
- Roast : un repli en cache n'est plus recalculé toutes les dix minutes quand aucun LLM n'est disponible (ADR-021).
- App : cartes des huit sections sous la roue, écran `reading/[sectionKey]`, zone floutée Skia avec la chaîne fixe `ui.blurFiller`. Sans droit, l'écran affiche une phrase « fait partie d'Aurorya Premium » ; le bouton « Lire la suite » et l'ouverture du paywall viendront avec le ticket des abonnements, pour ne pas poser un bouton qui ne mène nulle part.
Conséquences : `reading.noTimeNote` est affichée par l'app d'après le thème. À faire au choix du fournisseur : prompt `section.md`, validation, juge.
Validé par : mode autonome (ADR-013).

## ADR-023 — Carte partageable : capture par Skia, partage et enregistrement (T-034)
Date : 2026-11-24 · Statut : appliqué, non vérifié sur appareil
Contexte : SPEC §7.3, §15.8, §16.7. La SPEC laissait le choix entre `react-native-view-shot` et une capture Skia « après essai des deux ». Aucun appareil n'est disponible pour l'essai.
Décision :
- Capture par `makeImageFromView` de Skia, déjà installé : aucune dépendance native de plus. L'image est ramenée à 1080 × 1920 sur une surface hors écran, quelle que soit la densité de l'écran, écrite en PNG dans le cache, supprimée après usage.
- La carte est une vue de 360 × 640 points posée d'après le gabarit partagé (`CARD`), en couleurs du thème sombre quel que soit le thème. La réduction d'une punchline trop longue passe par `adjustsFontSizeToFit` avec le minimum du gabarit.
- Partage par `expo-sharing` (feuille d'iOS, image seule) ; enregistrement par `expo-media-library` avec l'autorisation d'ajout seul, demandée au moment du geste. Versions prises dans la liste de compatibilité du SDK 58 installé.
- Le domaine sous « Fais le tien » vient de `EXPO_PUBLIC_SITE_HOST` ; absent tant que le domaine n'est pas acheté (O-06), la ligne n'est pas dessinée.
- Écran de révélation : les trois actions de la SPEC, dans l'ordre (partager, lire le thème complet, créer un groupe), plus « Continuer ».
Limites connues : le lien du site n'accompagne pas l'image (la feuille de partage ne reçoit qu'un fichier) ; pas de grain sur le fond ; pas d'apparition une à une des punchlines, ni son ni retour haptique ; les événements `share_opened` et `share_completed` attendent l'outil de mesure. Le texte de l'autorisation photo n'existe qu'en français.
À vérifier au premier build : que la capture contient bien le symbole et le glyphe du mode (dessinés par Skia dans la vue) ; sinon, repli sur `react-native-view-shot`.
Validé par : mode autonome (ADR-013).

## ADR-024 — Build iOS et TestFlight par GitHub Actions, sans le service de build d'Expo
Date : 2026-11-24 · Statut : appliqué, jamais exécuté
Contexte : un fondateur demande de se passer d'un compte Expo pour le MVP et de tout piloter depuis un iPhone. Il a un compte Apple Developer actif. Choix fait par questionnaire.
Décision :
- Le code de l'app ne change pas : elle reste écrite avec le framework Expo, qui est une bibliothèque libre. Seul le service de build (EAS) est écarté.
- Workflow `.github/workflows/ios-testflight.yml`, lancé à la main : Mac de GitHub, `expo prebuild` pour produire le projet Xcode, `xcodebuild archive`, puis export signé et envoi à App Store Connect.
- Signature gérée par Apple (« cloud signing ») avec une clé d'API App Store Connect : aucun certificat ni profil n'est stocké dans le dépôt ou dans les secrets. Un seul secret GitHub : `ASC_KEY_P8`. L'équipe, l'identifiant de clé et l'émetteur sont de simples identifiants, écrits dans le workflow.
- Numéro de build = numéro d'exécution du workflow. Équipe Apple et numéro de build passent par `app.config.ts`.
- Les adresses publiques de l'app (API, Supabase, clé publique) sont écrites dans le workflow : elles sont embarquées dans l'app et ne sont pas des secrets.
Conséquences et risques :
- Coût : sur un dépôt privé, une minute de Mac compte pour dix minutes du forfait GitHub Actions. Un build dure de l'ordre de 20 à 40 minutes.
- Non vérifié : aucune exécution n'a eu lieu. La signature automatique à l'archive peut exiger qu'au moins un appareil soit enregistré sur le compte Apple ; la clé d'API doit avoir le rôle Admin pour créer le certificat de distribution géré.
- La fiche de l'app (`com.aurorya.app`) doit exister dans App Store Connect avant le premier envoi : création par un fondateur (interdit absolu sans validation humaine).
- `apps/mobile/eas.json` reste dans le dépôt, inutilisé.
Validé par : fondateur (choix de la voie), mise en œuvre en mode autonome.

## ADR-025 — Fiche App Store : textes et catégories (première version)
Date : 2026-11-24 · Statut : appliqué sur App Store Connect
Contexte : un fondateur a créé la fiche de l'app (identifiant Apple 6838627506, langue principale anglais) et demande une fiche soignée. Apple n'autorise pas la création d'une app par l'API, mais autorise la modification des textes.
Décision :
- Textes en français et en anglais dans `content/store/app-store.{fr-FR,en-US}.json` (source unique), posés par l'API : sous-titre, description, mots-clés, texte promotionnel.
- Catégorie principale Style de vie, secondaire Divertissement.
- Conformes à l'Annexe D : aucune promesse de prédiction, mention « divertissement et introspection », Ava présentée comme une IA. Le moteur est décrit comme « vérifié contre les données de référence de la NASA » (JPL Horizons, ADR-012), sans citer Swiss Ephemeris, qui n'est pas utilisé.
- Non faits, à décider avec un fondateur : prix et abonnements, classification d'âge, fiche de confidentialité, URL d'assistance et de politique de confidentialité, captures, pays.
Validé par : mode autonome (ADR-013), à la demande d'un fondateur.

## ADR-026 — Politique de confidentialité provisoire pour TestFlight
Date : 2026-11-26 · Statut : appliqué, à relire par un juriste
Contexte : TestFlight externe exige une adresse de politique de confidentialité. Aucune n'existait (T-073 non fait). Choix d'un fondateur par questionnaire : publier une version provisoire.
Décision : page `/confidentialite` du site, texte dans `content/legal/privacy.fr.json`, limité à ce que l'app fait réellement aujourd'hui (données saisies, compte anonyme, hébergement Supabase et Vercel à Francfort, aucune mesure d'audience, IA sans donnée identifiante, suppression et export). Marquée « version provisoire, relue par un juriste avant la sortie publique ». Contact : l'adresse donnée par le fondateur pour les retours TestFlight.
Conséquences : à remplacer par le texte relu au ticket T-073 ; à mettre à jour dès qu'un sous-traitant s'ajoute (fournisseur d'IA, RevenueCat, Mixpanel, Sentry, Resend).
Validé par : fondateur (principe), rédaction en mode autonome.

## ADR-027 — Installation directe (ad hoc) en plus de TestFlight
Date : 2026-11-26 · Statut : appliqué
Contexte : l'invitation TestFlight interne n'arrive pas dans la boîte du fondateur, et la soumission à l'examen TestFlight externe échoue côté Apple (« There was an error processing your request »), y compris depuis le site d'App Store Connect.
Décision : le workflow iOS prend une option `distribution` (`testflight` par défaut, ou `adhoc`). En `adhoc`, l'app est signée pour les iPhone enregistrés sur le compte Apple et le fichier .ipa est joint à l'exécution, pour une installation depuis un Mac (Finder) sans e-mail ni examen. L'iPhone du fondateur est enregistré par l'API.
Conséquences : limité à 100 iPhone par an et par type d'appareil ; chaque nouvel iPhone demande un nouveau build. TestFlight reste la voie normale dès que le blocage d'Apple est levé.
Complément (même jour) : à la demande du fondateur, l'installation se fait par un lien à ouvrir dans Safari sur l'iPhone. Le workflow dépose le .ipa et son manifeste dans l'espace Vercel Blob public `aurorya-installation` (adresse fixe, écrasée à chaque build) ; la page `/installer` du site porte le lien `itms-services`. Il faut le secret GitHub `BLOB_READ_WRITE_TOKEN`. Seuls les iPhone enregistrés peuvent installer l'app, même si le fichier est téléchargeable.
Validé par : fondateur (demande d'une autre voie, puis d'un lien), mise en œuvre en mode autonome.

## ADR-028 — Le droit Premium se lit toujours dans la fiche cliente de RevenueCat (2026-11-26)
- **Contexte** : SPEC §18.3 demande un webhook qui « met à jour » le droit à partir de l'événement. La documentation de RevenueCat recommande au contraire d'appeler `GET /subscribers` après chaque webhook plutôt que d'interpréter chaque type d'événement.
- **Décision** : webhook et rattrapage partagent une seule fonction pure (`entitlementFromSubscriber`). Le webhook sert de signal et d'horodatage (`rc_event_at`) ; l'état vient de la fiche. Un transfert relit l'ancienne et la nouvelle propriétaire.
- **Conséquences** : un appel sortant par événement (borné, 8 s) ; un nouveau type d'événement ne casse rien. L'en-tête d'autorisation attendu est `Bearer <REVENUECAT_WEBHOOK_SECRET>`. La signature HMAC proposée par RevenueCat n'est pas utilisée pour l'instant.
- **Écart avec l'ordre de mission** : pas d'offre fondatrice à l'écran (O-03 ouvert, SPEC §18.4) ; conditions d'utilisation = contrat standard d'Apple en attendant des conditions propres (à valider par un fondateur, sujet juridique).

## ADR-029 — Passage au périmètre du Cahier de Conception v1.0 : arbitrages du Lot 0 (2026-11-26)
- **Contexte** : un fondateur a transmis un ordre de mission « Alignement sur le Cahier de Conception v1.0 » (cinq onglets, identité visuelle générative, horoscopes jour, semaine et mois, transits détaillés, synastrie à deux profils). Il contredit la SPEC v2 sur le périmètre, la palette et la navigation. Le cahier lui-même (PDF) n'a pas encore été transmis.
- **Décisions du fondateur, par questionnaire** :
  1. Existant v2 : **intégré**. Les trois tons restent un réglage global, le roast et sa carte vont dans le partage, les groupes dans Explorer à côté de la synastrie.
  2. Navigation : **cinq onglets**, avec un Journal minimal au MVP (lectures et horoscopes sauvegardés, note libre) ; le journal complet reste en V2.
  3. Moteur : **astronomy-engine conservé**, ajout du Nœud Sud. Pas de Chiron, pas de Swiss Ephemeris.
  4. Plateformes : **iOS d'abord**. Le code reste compatible Android, sans build ni fiche Google Play.
  5. Mesure d'audience : **PostHog, région UE**, à la place de Mixpanel. Fournisseur d'IA : **toujours ouvert** (O-08) ; l'adaptateur réel attend ce choix.
  6. Fonds de carte : générés par `scripts/assets/card-backgrounds.ts`, à refaire aux couleurs de la nouvelle palette au Lot 1 puis à promouvoir.
- **Restent aux fondateurs** : marque (INPI, EUIPO), entité juridique, relecture RGPD, domaine, comptes RevenueCat et Resend, fournisseur d'IA.
- **Conséquence** : `docs/SPEC.md` doit être mise à jour à partir du cahier avant tout code de ce chantier ; tant que le PDF n'est pas reçu, la SPEC v2 reste la source de vérité et rien du nouveau périmètre n'est codé.
