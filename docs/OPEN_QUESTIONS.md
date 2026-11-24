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
- **Q-01** — Tranchée par ADR-012 : JPL Horizons.
- **Q-02** — Tranchée en partie par ADR-008 (compte et abonnements inclus). Reste : la roue interactive fait-elle partie de la première soumission ?
- **Q-03** — Tranchée par ADR-009.
- **Q-04** — Outil dédié de détection de secrets en CI, en remplacement de `scripts/check-secrets.mjs` (contrôle minimal maison).
- **Q-05** — Migration vers pnpm 12.
- **Q-06** — ADR-010 et ADR-011 (couleurs proposées) attendent une validation du design.
- **Q-07** — Sources et licences des photos célestes (ADR-007) : les images de la NASA et de l'ESA sont une piste, à vérifier.
- **Q-08** — Adaptateur de précision supérieure lisant les éphémérides publiques du JPL (ADR-012), pour revenir à la tolérance de 0,001°.
- **Q-09** — Contrôle croisé humain de cinq thèmes de personnalités (§11.8) : non fait. Aucune référence externe pour les cuspides de Placidus (vérifiées par leur définition géométrique et par un calcul indépendant de l'Ascendant).
- **Q-10** — Avant 1970, la base IANA ne garantit que la ville de référence de chaque zone ; `Europe/Luxembourg` et `Europe/Brussels` peuvent partager leurs règles anciennes. À documenter dans la page d'aide (§11.4).

## Idées hors périmètre
(aucune)
