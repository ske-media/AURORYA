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
