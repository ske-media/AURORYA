# Questions ouvertes

Les points O-xx renvoient à SPEC §2.4. Tranchés le 2026-11-23 : O-02, O-03, O-04, O-07, O-10, O-11 (voir `DECISIONS.md`).

## Toujours ouverts (SPEC)
| ID | Sujet | Valeur provisoire |
|---|---|---|
| O-01 | Disponibilité du nom « Aurorya » | Continuer ; nom en configuration uniquement. |
| O-05 | Structure juridique | En cours de création. Variables `LEGAL_ENTITY_*` vides. |
| O-06 | Nom de domaine | Pas encore acheté. `PUBLIC_SITE_URL` vide. |
| O-08 | Fournisseur d'IA | À décider à T-030. |
| O-09 | Synthèse vocale | Aucune au MVP. |
| O-12 | Âge minimum | 16 ans, à confirmer par le juriste. |
| O-13 | « groupes » ou « cercles » | « groupes ». |
| O-14 | Astrologue relectrice | Entrées en `draft_ai`. |
| O-15 | Signature de marque | « The sky, unfiltered », provisoire. |

## Nouvelles questions
- **Q-01** — Avec la voie C (ADR-001), quelle source produit les valeurs de référence du moteur (§11.8) ? L'outil en ligne de commande de Swiss Ephemeris pose une question de licence ; alternative possible : les éphémérides publiques du JPL (service Horizons). À trancher à T-004.
- **Q-02** — Contenu exact de la première soumission à Apple (ADR-002) : la roue, le compte et les abonnements en font-ils partie ? Sans achat intégré, pas de paywall à faire examiner ; sans compte, pas de création de groupe (§7.6).
- **Q-03** — Identifiants et dimensions de la famille de photos célestes qui remplace `engraving-*` (ADR-007). À valider avant T-002.
- **Q-04** — Outil dédié de détection de secrets en CI, en remplacement de `scripts/check-secrets.mjs` (contrôle minimal maison).
- **Q-05** — Migration vers pnpm 12.

## Idées hors périmètre
(aucune)
