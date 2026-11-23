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
| zod | 4.6.7 | MIT | registre npm, `package.json` du paquet | Validation du registre des fichiers (racine). Servira aux schémas partagés. |
| sharp | 0.35.5 | Apache-2.0 | registre npm, `package.json` du paquet | Outil de développement : fichiers provisoires et mesure des images. Piège : voir STATE. |
| lucide-static | 1.78.0 | ISC | registre npm, fichier `LICENSE` | Source des 18 icônes d'interface copiées dans le registre. Pas utilisé à l'exécution. |
| astronomy-engine | 2.1.19 | MIT | `package.json` et `astronomy.d.ts` du paquet ; précision mesurée contre JPL Horizons (ADR-012) | Moteur. Traite UTC et UT1 comme identiques. `GeoVector(…, true)` : temps de lumière et aberration ; `Rotation_EQJ_ECT` : écliptique vraie de la date. |
| @js-joda/core | 6.3.2 | BSD-3-Clause | typings du paquet | Fuseaux. `ZoneRules.validOffsets()` renvoie 0, 1 ou 2 décalages (saut, normal, heure répétée). |
| @js-joda/timezone | 3.2.1 | BSD-3-Clause | README du paquet | Base IANA 2026f embarquée (version non exposée par le code : constante vérifiée par un test). Importer le paquet complet, jamais une variante « year-range ». Concorde avec la base du système pour Paris, Zurich, Bruxelles, Luxembourg, Toronto de 1900 à 2026 (test). |

## Application mobile (vérifié le 2026-11-23)

Versions lues dans le gabarit officiel `create-expo-app` (SDK 58) et dans `expo/bundledNativeModules.json` du paquet installé.
`npx expo install` n'a pas pu être utilisé : son service de versions n'est pas joignable depuis l'environnement de développement.

| Paquet | Version | Licence | Remarques |
|---|---|---|---|
| expo | 58.0.26 | MIT | Nouvelle architecture. Les API ont changé : lire les types installés avant tout usage. |
| expo-router | 58.0.32 | MIT | Onglets : `NativeTabs` depuis `expo-router/native-tabs`, icônes par symboles SF (`sf`). `Tabs` de l'entrée principale est déprécié. |
| react / react-native | 19.3.0 / 0.88.1 | MIT | |
| react-native-reanimated / worklets | 4.7.1 / 0.13.0 | MIT | Pas de configuration Babel propre : celle d'Expo suffit. |
| react-native-gesture-handler, safe-area-context, screens | 3.3.0, 5.11.1, 4.30.1 | MIT | |
| expo-font, splash-screen, status-bar, system-ui, constants, linking | 58.x | MIT | |
| expo-localization, expo-haptics, expo-dev-client | 58.0.5, 58.0.8, 58.0.21 | MIT | |
| @shopify/react-native-skia | 2.14.0 | MIT | Installé, pas encore utilisé (roue, T-014). |
| i18next / react-i18next | 27.2.6 / 18.0.3 | MIT | |

Vérification : `expo export --platform ios` produit un bundle Hermes de 3,4 Mo avec les polices et les 100 fichiers du registre, en installation pnpm isolée, sans configuration Metro ni Babel.

## Relevé, pas encore installé

| Paquet | Dernière version stable relevée | À vérifier au ticket |
|---|---|---|
| next | 16.4.6 | T-008. |
| expo-secure-store, expo-notifications, expo-audio, expo-sharing, expo-image, expo-apple-authentication | 58.0.3, 58.1.9, 58.0.12, 58.0.23, 58.0.18, 58.0.3 | avec leurs tickets |
| react-native-view-shot | 6.1.1 | T-034 |
| react-native-mmkv | absent de la liste d'Expo | T-013 : vérifier la compatibilité |

## Non vérifié
- Versions des actions GitHub de la CI (`actions/checkout@v4`, `pnpm/action-setup@v4`, `actions/setup-node@v4`).
- Syntaxe `permissions.deny` de `.claude/settings.json` : écrite d'après la documentation de Claude Code, pas éprouvée dans cette session.

## Polices (récupérées le 2026-11-23)

| Fichier | Source | Licence | Remarques |
|---|---|---|---|
| CormorantGaramond-Medium, -MediumItalic | dépôt CatharsisFonts/Cormorant, `fonts/ttf` | OFL-1.1 | Aucun nom réservé déclaré. |
| Inter-Regular, -Medium | rsms/inter, version 4.1, `extras/ttf` | OFL-1.1 | Aucun nom réservé déclaré. |
| Manrope-SemiBold | google/fonts, `ofl/manrope/Manrope[wght].ttf` | OFL-1.1 | Instance statique (wght 600) produite avec fontTools 4.68.0. Aucun nom réservé déclaré. |

Les textes de licence sont dans `apps/mobile/assets/fonts/licenses/`.

## Services externes

| Service | Usage | Vérifié le | Remarques |
|---|---|---|---|
| JPL Horizons (`ssd.jpl.nasa.gov/api/horizons.api`) | Valeurs de référence du moteur (DE441) | 2026-11-23 | Quantité 31 : longitude et latitude écliptiques apparentes de la date. Temps universel pour les tables d'observation, TDB pour les éléments. Connexions parfois coupées : le script réessaie. Depuis Node, passer par curl. |
