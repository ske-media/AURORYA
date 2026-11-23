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
