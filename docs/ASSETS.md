# Fichiers visuels et sonores

Rapport généré par `pnpm assets:report` à partir de `assets.manifest.json`. Ne pas modifier à la main.

- 126 fichiers au registre : 26 définitifs, 100 provisoires.
- 93 fichiers provisoires bloquent une mise en production.

## Livrer un fichier

1. Trouver sa ligne ci-dessous : nom exact, dossier, format, dimensions, contraintes.
2. Exporter le fichier avec exactement ce nom, ce format et ces dimensions.
3. Le déposer dans le dossier indiqué, en remplaçant le fichier provisoire.
4. Renseigner `source` et `license` de l'entrée dans `assets.manifest.json`.
5. Lancer `pnpm assets:check --promote`, puis envoyer la modification.

## Reste à livrer

### `apps/mobile/assets/brand/`

| Fichier | Dimensions | Transparence | Poids max. | Bloquant | Contraintes |
|---|---|---|---|---|---|
| `brand-wordmark.svg` | 640 × 96 | — | 100 Ko | oui | « AURORYA » vectorisé (Cormorant Garamond 500, interlettrage 0,34 em), une seule couleur. |
| `brand-lockup-vertical.svg` | 640 × 520 | — | 100 Ko | oui | Symbole au-dessus du nom. |
| `brand-lockup-horizontal.svg` | 760 × 200 | — | 100 Ko | oui | Symbole à gauche du nom. |

### `apps/mobile/assets/cards/`

| Fichier | Dimensions | Transparence | Poids max. | Bloquant | Contraintes |
|---|---|---|---|---|---|
| `card-bg-roast-soft.webp` | 1080 × 1920 | non | 600 Ko | oui | Fond de la carte en mode Lune. Zones du §16.7 laissées calmes. Aucun texte. |
| `card-bg-roast-cash.webp` | 1080 × 1920 | non | 600 Ko | oui | Fond de la carte en mode Mars. Aucun texte. |
| `card-bg-roast-expert.webp` | 1080 × 1920 | non | 600 Ko | oui | Fond de la carte en mode Saturne. Aucun texte. |
| `card-bg-group.webp` | 1080 × 1920 | non | 600 Ko | oui | Fond de la carte de groupe. Aucun texte. |

### `apps/mobile/assets/glyphs/aspects/`

| Fichier | Dimensions | Transparence | Poids max. | Bloquant | Contraintes |
|---|---|---|---|---|---|
| `glyph-aspect-conjunction.svg` | 24 × 24 | — | 10 Ko | oui | viewBox 0 0 24 24, un seul <path>, trait seul de 1,5 à extrémités arrondies, sans remplissage, transformation ni style ; marge intérieure de 2. |
| `glyph-aspect-opposition.svg` | 24 × 24 | — | 10 Ko | oui | viewBox 0 0 24 24, un seul <path>, trait seul de 1,5 à extrémités arrondies, sans remplissage, transformation ni style ; marge intérieure de 2. |
| `glyph-aspect-trine.svg` | 24 × 24 | — | 10 Ko | oui | viewBox 0 0 24 24, un seul <path>, trait seul de 1,5 à extrémités arrondies, sans remplissage, transformation ni style ; marge intérieure de 2. |
| `glyph-aspect-square.svg` | 24 × 24 | — | 10 Ko | oui | viewBox 0 0 24 24, un seul <path>, trait seul de 1,5 à extrémités arrondies, sans remplissage, transformation ni style ; marge intérieure de 2. |
| `glyph-aspect-sextile.svg` | 24 × 24 | — | 10 Ko | oui | viewBox 0 0 24 24, un seul <path>, trait seul de 1,5 à extrémités arrondies, sans remplissage, transformation ni style ; marge intérieure de 2. |

### `apps/mobile/assets/glyphs/bodies/`

| Fichier | Dimensions | Transparence | Poids max. | Bloquant | Contraintes |
|---|---|---|---|---|---|
| `glyph-body-sun.svg` | 24 × 24 | — | 10 Ko | oui | viewBox 0 0 24 24, un seul <path>, trait seul de 1,5 à extrémités arrondies, sans remplissage, transformation ni style ; marge intérieure de 2. |
| `glyph-body-moon.svg` | 24 × 24 | — | 10 Ko | oui | viewBox 0 0 24 24, un seul <path>, trait seul de 1,5 à extrémités arrondies, sans remplissage, transformation ni style ; marge intérieure de 2. |
| `glyph-body-mercury.svg` | 24 × 24 | — | 10 Ko | oui | viewBox 0 0 24 24, un seul <path>, trait seul de 1,5 à extrémités arrondies, sans remplissage, transformation ni style ; marge intérieure de 2. |
| `glyph-body-venus.svg` | 24 × 24 | — | 10 Ko | oui | viewBox 0 0 24 24, un seul <path>, trait seul de 1,5 à extrémités arrondies, sans remplissage, transformation ni style ; marge intérieure de 2. |
| `glyph-body-mars.svg` | 24 × 24 | — | 10 Ko | oui | viewBox 0 0 24 24, un seul <path>, trait seul de 1,5 à extrémités arrondies, sans remplissage, transformation ni style ; marge intérieure de 2. |
| `glyph-body-jupiter.svg` | 24 × 24 | — | 10 Ko | oui | viewBox 0 0 24 24, un seul <path>, trait seul de 1,5 à extrémités arrondies, sans remplissage, transformation ni style ; marge intérieure de 2. |
| `glyph-body-saturn.svg` | 24 × 24 | — | 10 Ko | oui | viewBox 0 0 24 24, un seul <path>, trait seul de 1,5 à extrémités arrondies, sans remplissage, transformation ni style ; marge intérieure de 2. |
| `glyph-body-uranus.svg` | 24 × 24 | — | 10 Ko | oui | viewBox 0 0 24 24, un seul <path>, trait seul de 1,5 à extrémités arrondies, sans remplissage, transformation ni style ; marge intérieure de 2. |
| `glyph-body-neptune.svg` | 24 × 24 | — | 10 Ko | oui | viewBox 0 0 24 24, un seul <path>, trait seul de 1,5 à extrémités arrondies, sans remplissage, transformation ni style ; marge intérieure de 2. |
| `glyph-body-pluto.svg` | 24 × 24 | — | 10 Ko | oui | viewBox 0 0 24 24, un seul <path>, trait seul de 1,5 à extrémités arrondies, sans remplissage, transformation ni style ; marge intérieure de 2. |
| `glyph-body-north-node.svg` | 24 × 24 | — | 10 Ko | oui | viewBox 0 0 24 24, un seul <path>, trait seul de 1,5 à extrémités arrondies, sans remplissage, transformation ni style ; marge intérieure de 2. |

### `apps/mobile/assets/glyphs/modes/`

| Fichier | Dimensions | Transparence | Poids max. | Bloquant | Contraintes |
|---|---|---|---|---|---|
| `glyph-mode-soft.svg` | 24 × 24 | — | 10 Ko | oui | viewBox 0 0 24 24, un seul <path>, trait seul de 1,5 à extrémités arrondies, sans remplissage, transformation ni style ; marge intérieure de 2. |
| `glyph-mode-cash.svg` | 24 × 24 | — | 10 Ko | oui | viewBox 0 0 24 24, un seul <path>, trait seul de 1,5 à extrémités arrondies, sans remplissage, transformation ni style ; marge intérieure de 2. |
| `glyph-mode-expert.svg` | 24 × 24 | — | 10 Ko | oui | viewBox 0 0 24 24, un seul <path>, trait seul de 1,5 à extrémités arrondies, sans remplissage, transformation ni style ; marge intérieure de 2. |

### `apps/mobile/assets/glyphs/signs/`

| Fichier | Dimensions | Transparence | Poids max. | Bloquant | Contraintes |
|---|---|---|---|---|---|
| `glyph-sign-aries.svg` | 24 × 24 | — | 10 Ko | oui | viewBox 0 0 24 24, un seul <path>, trait seul de 1,5 à extrémités arrondies, sans remplissage, transformation ni style ; marge intérieure de 2. |
| `glyph-sign-taurus.svg` | 24 × 24 | — | 10 Ko | oui | viewBox 0 0 24 24, un seul <path>, trait seul de 1,5 à extrémités arrondies, sans remplissage, transformation ni style ; marge intérieure de 2. |
| `glyph-sign-gemini.svg` | 24 × 24 | — | 10 Ko | oui | viewBox 0 0 24 24, un seul <path>, trait seul de 1,5 à extrémités arrondies, sans remplissage, transformation ni style ; marge intérieure de 2. |
| `glyph-sign-cancer.svg` | 24 × 24 | — | 10 Ko | oui | viewBox 0 0 24 24, un seul <path>, trait seul de 1,5 à extrémités arrondies, sans remplissage, transformation ni style ; marge intérieure de 2. |
| `glyph-sign-leo.svg` | 24 × 24 | — | 10 Ko | oui | viewBox 0 0 24 24, un seul <path>, trait seul de 1,5 à extrémités arrondies, sans remplissage, transformation ni style ; marge intérieure de 2. |
| `glyph-sign-virgo.svg` | 24 × 24 | — | 10 Ko | oui | viewBox 0 0 24 24, un seul <path>, trait seul de 1,5 à extrémités arrondies, sans remplissage, transformation ni style ; marge intérieure de 2. |
| `glyph-sign-libra.svg` | 24 × 24 | — | 10 Ko | oui | viewBox 0 0 24 24, un seul <path>, trait seul de 1,5 à extrémités arrondies, sans remplissage, transformation ni style ; marge intérieure de 2. |
| `glyph-sign-scorpio.svg` | 24 × 24 | — | 10 Ko | oui | viewBox 0 0 24 24, un seul <path>, trait seul de 1,5 à extrémités arrondies, sans remplissage, transformation ni style ; marge intérieure de 2. |
| `glyph-sign-sagittarius.svg` | 24 × 24 | — | 10 Ko | oui | viewBox 0 0 24 24, un seul <path>, trait seul de 1,5 à extrémités arrondies, sans remplissage, transformation ni style ; marge intérieure de 2. |
| `glyph-sign-capricorn.svg` | 24 × 24 | — | 10 Ko | oui | viewBox 0 0 24 24, un seul <path>, trait seul de 1,5 à extrémités arrondies, sans remplissage, transformation ni style ; marge intérieure de 2. |
| `glyph-sign-aquarius.svg` | 24 × 24 | — | 10 Ko | oui | viewBox 0 0 24 24, un seul <path>, trait seul de 1,5 à extrémités arrondies, sans remplissage, transformation ni style ; marge intérieure de 2. |
| `glyph-sign-pisces.svg` | 24 × 24 | — | 10 Ko | oui | viewBox 0 0 24 24, un seul <path>, trait seul de 1,5 à extrémités arrondies, sans remplissage, transformation ni style ; marge intérieure de 2. |

### `apps/mobile/assets/icons/`

| Fichier | Dimensions | Transparence | Poids max. | Bloquant | Contraintes |
|---|---|---|---|---|---|
| `icon-app-ios.png` | 1024 × 1024 | non | 2 Mo | oui | Symbole sur midnight, occupant 73 % du côté. Formats exigés par iOS à vérifier. |
| `icon-app-ios-dark.png` | 1024 × 1024 | non | 2 Mo | oui | Variante sombre. |
| `icon-app-ios-tinted.png` | 1024 × 1024 | non | 2 Mo | oui | Variante teintée, en niveaux de gris. |
| `splash-symbol.png` | 1024 × 1024 | oui | 2 Mo | oui | Symbole seul ; la couleur de fond vient de la configuration. |
| `icon-notification.png` | 96 × 96 | oui | 2 Mo | non | Réservé (Android). |

### `apps/mobile/assets/photos/bodies/`

| Fichier | Dimensions | Transparence | Poids max. | Bloquant | Contraintes |
|---|---|---|---|---|---|
| `photo-body-sun.webp` | 800 × 800 | oui | 400 Ko | oui | Photo céleste (ADR-007) : lune, ciel étoilé ou nébuleuse, bords fondus vers la transparence, violet désaturé et bleu nuit, aucun texte. Origine et licence à consigner. |
| `photo-body-moon.webp` | 800 × 800 | oui | 400 Ko | oui | Photo céleste (ADR-007) : lune, ciel étoilé ou nébuleuse, bords fondus vers la transparence, violet désaturé et bleu nuit, aucun texte. Origine et licence à consigner. |
| `photo-body-mercury.webp` | 800 × 800 | oui | 400 Ko | oui | Photo céleste (ADR-007) : lune, ciel étoilé ou nébuleuse, bords fondus vers la transparence, violet désaturé et bleu nuit, aucun texte. Origine et licence à consigner. |
| `photo-body-venus.webp` | 800 × 800 | oui | 400 Ko | oui | Photo céleste (ADR-007) : lune, ciel étoilé ou nébuleuse, bords fondus vers la transparence, violet désaturé et bleu nuit, aucun texte. Origine et licence à consigner. |
| `photo-body-mars.webp` | 800 × 800 | oui | 400 Ko | oui | Photo céleste (ADR-007) : lune, ciel étoilé ou nébuleuse, bords fondus vers la transparence, violet désaturé et bleu nuit, aucun texte. Origine et licence à consigner. |
| `photo-body-jupiter.webp` | 800 × 800 | oui | 400 Ko | oui | Photo céleste (ADR-007) : lune, ciel étoilé ou nébuleuse, bords fondus vers la transparence, violet désaturé et bleu nuit, aucun texte. Origine et licence à consigner. |
| `photo-body-saturn.webp` | 800 × 800 | oui | 400 Ko | oui | Photo céleste (ADR-007) : lune, ciel étoilé ou nébuleuse, bords fondus vers la transparence, violet désaturé et bleu nuit, aucun texte. Origine et licence à consigner. |
| `photo-body-uranus.webp` | 800 × 800 | oui | 400 Ko | oui | Photo céleste (ADR-007) : lune, ciel étoilé ou nébuleuse, bords fondus vers la transparence, violet désaturé et bleu nuit, aucun texte. Origine et licence à consigner. |
| `photo-body-neptune.webp` | 800 × 800 | oui | 400 Ko | oui | Photo céleste (ADR-007) : lune, ciel étoilé ou nébuleuse, bords fondus vers la transparence, violet désaturé et bleu nuit, aucun texte. Origine et licence à consigner. |
| `photo-body-pluto.webp` | 800 × 800 | oui | 400 Ko | oui | Photo céleste (ADR-007) : lune, ciel étoilé ou nébuleuse, bords fondus vers la transparence, violet désaturé et bleu nuit, aucun texte. Origine et licence à consigner. |

### `apps/mobile/assets/photos/groups/`

| Fichier | Dimensions | Transparence | Poids max. | Bloquant | Contraintes |
|---|---|---|---|---|---|
| `photo-group-friends.webp` | 1200 × 800 | oui | 400 Ko | oui | Photo céleste (ADR-007) : lune, ciel étoilé ou nébuleuse, bords fondus vers la transparence, violet désaturé et bleu nuit, aucun texte. Origine et licence à consigner. |
| `photo-group-couple.webp` | 1200 × 800 | oui | 400 Ko | oui | Photo céleste (ADR-007) : lune, ciel étoilé ou nébuleuse, bords fondus vers la transparence, violet désaturé et bleu nuit, aucun texte. Origine et licence à consigner. |
| `photo-group-family.webp` | 1200 × 800 | oui | 400 Ko | oui | Photo céleste (ADR-007) : lune, ciel étoilé ou nébuleuse, bords fondus vers la transparence, violet désaturé et bleu nuit, aucun texte. Origine et licence à consigner. |
| `photo-group-colleagues.webp` | 1200 × 800 | oui | 400 Ko | oui | Photo céleste (ADR-007) : lune, ciel étoilé ou nébuleuse, bords fondus vers la transparence, violet désaturé et bleu nuit, aucun texte. Origine et licence à consigner. |

### `apps/mobile/assets/photos/scenes/`

| Fichier | Dimensions | Transparence | Poids max. | Bloquant | Contraintes |
|---|---|---|---|---|---|
| `photo-scene-welcome.webp` | 1200 × 1200 | oui | 400 Ko | oui | Photo céleste (ADR-007) : lune, ciel étoilé ou nébuleuse, bords fondus vers la transparence, violet désaturé et bleu nuit, aucun texte. Origine et licence à consigner. |
| `photo-scene-notif-primer.webp` | 1200 × 1200 | oui | 400 Ko | oui | Photo céleste (ADR-007) : lune, ciel étoilé ou nébuleuse, bords fondus vers la transparence, violet désaturé et bleu nuit, aucun texte. Origine et licence à consigner. |
| `photo-scene-account.webp` | 1200 × 1200 | oui | 400 Ko | oui | Photo céleste (ADR-007) : lune, ciel étoilé ou nébuleuse, bords fondus vers la transparence, violet désaturé et bleu nuit, aucun texte. Origine et licence à consigner. |
| `photo-scene-paywall.webp` | 1200 × 1200 | oui | 400 Ko | oui | Photo céleste (ADR-007) : lune, ciel étoilé ou nébuleuse, bords fondus vers la transparence, violet désaturé et bleu nuit, aucun texte. Origine et licence à consigner. |
| `photo-scene-empty-groups.webp` | 1200 × 1200 | oui | 400 Ko | oui | Photo céleste (ADR-007) : lune, ciel étoilé ou nébuleuse, bords fondus vers la transparence, violet désaturé et bleu nuit, aucun texte. Origine et licence à consigner. |
| `photo-scene-offline.webp` | 1200 × 1200 | oui | 400 Ko | oui | Photo céleste (ADR-007) : lune, ciel étoilé ou nébuleuse, bords fondus vers la transparence, violet désaturé et bleu nuit, aucun texte. Origine et licence à consigner. |
| `photo-scene-error.webp` | 1200 × 1200 | oui | 400 Ko | oui | Photo céleste (ADR-007) : lune, ciel étoilé ou nébuleuse, bords fondus vers la transparence, violet désaturé et bleu nuit, aucun texte. Origine et licence à consigner. |
| `photo-scene-age-gate.webp` | 1200 × 1200 | oui | 400 Ko | oui | Photo céleste (ADR-007) : lune, ciel étoilé ou nébuleuse, bords fondus vers la transparence, violet désaturé et bleu nuit, aucun texte. Origine et licence à consigner. |

### `apps/mobile/assets/photos/signs/`

| Fichier | Dimensions | Transparence | Poids max. | Bloquant | Contraintes |
|---|---|---|---|---|---|
| `photo-sign-aries.webp` | 1200 × 1200 | oui | 400 Ko | oui | Photo céleste (ADR-007) : lune, ciel étoilé ou nébuleuse, bords fondus vers la transparence, violet désaturé et bleu nuit, aucun texte. Origine et licence à consigner. |
| `photo-sign-taurus.webp` | 1200 × 1200 | oui | 400 Ko | oui | Photo céleste (ADR-007) : lune, ciel étoilé ou nébuleuse, bords fondus vers la transparence, violet désaturé et bleu nuit, aucun texte. Origine et licence à consigner. |
| `photo-sign-gemini.webp` | 1200 × 1200 | oui | 400 Ko | oui | Photo céleste (ADR-007) : lune, ciel étoilé ou nébuleuse, bords fondus vers la transparence, violet désaturé et bleu nuit, aucun texte. Origine et licence à consigner. |
| `photo-sign-cancer.webp` | 1200 × 1200 | oui | 400 Ko | oui | Photo céleste (ADR-007) : lune, ciel étoilé ou nébuleuse, bords fondus vers la transparence, violet désaturé et bleu nuit, aucun texte. Origine et licence à consigner. |
| `photo-sign-leo.webp` | 1200 × 1200 | oui | 400 Ko | oui | Photo céleste (ADR-007) : lune, ciel étoilé ou nébuleuse, bords fondus vers la transparence, violet désaturé et bleu nuit, aucun texte. Origine et licence à consigner. |
| `photo-sign-virgo.webp` | 1200 × 1200 | oui | 400 Ko | oui | Photo céleste (ADR-007) : lune, ciel étoilé ou nébuleuse, bords fondus vers la transparence, violet désaturé et bleu nuit, aucun texte. Origine et licence à consigner. |
| `photo-sign-libra.webp` | 1200 × 1200 | oui | 400 Ko | oui | Photo céleste (ADR-007) : lune, ciel étoilé ou nébuleuse, bords fondus vers la transparence, violet désaturé et bleu nuit, aucun texte. Origine et licence à consigner. |
| `photo-sign-scorpio.webp` | 1200 × 1200 | oui | 400 Ko | oui | Photo céleste (ADR-007) : lune, ciel étoilé ou nébuleuse, bords fondus vers la transparence, violet désaturé et bleu nuit, aucun texte. Origine et licence à consigner. |
| `photo-sign-sagittarius.webp` | 1200 × 1200 | oui | 400 Ko | oui | Photo céleste (ADR-007) : lune, ciel étoilé ou nébuleuse, bords fondus vers la transparence, violet désaturé et bleu nuit, aucun texte. Origine et licence à consigner. |
| `photo-sign-capricorn.webp` | 1200 × 1200 | oui | 400 Ko | oui | Photo céleste (ADR-007) : lune, ciel étoilé ou nébuleuse, bords fondus vers la transparence, violet désaturé et bleu nuit, aucun texte. Origine et licence à consigner. |
| `photo-sign-aquarius.webp` | 1200 × 1200 | oui | 400 Ko | oui | Photo céleste (ADR-007) : lune, ciel étoilé ou nébuleuse, bords fondus vers la transparence, violet désaturé et bleu nuit, aucun texte. Origine et licence à consigner. |
| `photo-sign-pisces.webp` | 1200 × 1200 | oui | 400 Ko | oui | Photo céleste (ADR-007) : lune, ciel étoilé ou nébuleuse, bords fondus vers la transparence, violet désaturé et bleu nuit, aucun texte. Origine et licence à consigner. |

### `apps/mobile/assets/sounds/`

| Fichier | Dimensions | Transparence | Poids max. | Bloquant | Contraintes |
|---|---|---|---|---|---|
| `sfx-reveal.wav` | ≤ 3 s | — | 300 Ko | oui | wav, 44,1 kHz, 16 bits, mono, niveau normalisé. Licence à consigner. |
| `sfx-tap-soft.wav` | ≤ 3 s | — | 300 Ko | oui | wav, 44,1 kHz, 16 bits, mono, niveau normalisé. Licence à consigner. |
| `sfx-share.wav` | ≤ 3 s | — | 300 Ko | oui | wav, 44,1 kHz, 16 bits, mono, niveau normalisé. Licence à consigner. |
| `sfx-join.wav` | ≤ 3 s | — | 300 Ko | oui | wav, 44,1 kHz, 16 bits, mono, niveau normalisé. Licence à consigner. |
| `sfx-aurora-rise.wav` | ≤ 6 s | — | 300 Ko | oui | wav, 44,1 kHz, 16 bits, mono, niveau normalisé. Licence à consigner. |

### `apps/mobile/assets/textures/`

| Fichier | Dimensions | Transparence | Poids max. | Bloquant | Contraintes |
|---|---|---|---|---|---|
| `texture-grain.png` | 512 × 512 | oui | 300 Ko | oui | Grain léger superposé, raccordable. |

### `apps/web/public/`

| Fichier | Dimensions | Transparence | Poids max. | Bloquant | Contraintes |
|---|---|---|---|---|---|
| `og-default.png` | 1200 × 630 | non | 1 Mo | oui | Aperçu de lien générique, sans nom de personne. |
| `favicon.svg` | 200 × 200 | — | 10 Ko | oui | Affiché en 32 × 32. Provisoire : symbole mono. |
| `favicon-32.png` | 32 × 32 | — | 10 Ko | oui |  |
| `apple-touch-icon.png` | 180 × 180 | non | 100 Ko | oui |  |
| `web-hero.webp` | 2400 × 1600 | non | 800 Ko | oui | Visuel d'accueil du site. |

### `store/ios/en/`

| Fichier | Dimensions | Transparence | Poids max. | Bloquant | Contraintes |
|---|---|---|---|---|---|
| `store-screenshot-01-roast.png` | 1290 × 2796 | non | 8 Mo | non | Dimensions provisoires, À VÉRIFIER dans l'aide d'App Store Connect au moment de la soumission. Textes dans screenshots.json, pas dans l'image. |
| `store-screenshot-02-wheel.png` | 1290 × 2796 | non | 8 Mo | non | Dimensions provisoires, À VÉRIFIER dans l'aide d'App Store Connect au moment de la soumission. Textes dans screenshots.json, pas dans l'image. |
| `store-screenshot-03-group.png` | 1290 × 2796 | non | 8 Mo | non | Dimensions provisoires, À VÉRIFIER dans l'aide d'App Store Connect au moment de la soumission. Textes dans screenshots.json, pas dans l'image. |
| `store-screenshot-04-daily.png` | 1290 × 2796 | non | 8 Mo | non | Dimensions provisoires, À VÉRIFIER dans l'aide d'App Store Connect au moment de la soumission. Textes dans screenshots.json, pas dans l'image. |
| `store-screenshot-05-reading.png` | 1290 × 2796 | non | 8 Mo | non | Dimensions provisoires, À VÉRIFIER dans l'aide d'App Store Connect au moment de la soumission. Textes dans screenshots.json, pas dans l'image. |
| `store-screenshot-06-modes.png` | 1290 × 2796 | non | 8 Mo | non | Dimensions provisoires, À VÉRIFIER dans l'aide d'App Store Connect au moment de la soumission. Textes dans screenshots.json, pas dans l'image. |

### `store/ios/fr/`

| Fichier | Dimensions | Transparence | Poids max. | Bloquant | Contraintes |
|---|---|---|---|---|---|
| `store-screenshot-01-roast.png` | 1290 × 2796 | non | 8 Mo | oui | Dimensions provisoires, À VÉRIFIER dans l'aide d'App Store Connect au moment de la soumission. Textes dans screenshots.json, pas dans l'image. |
| `store-screenshot-02-wheel.png` | 1290 × 2796 | non | 8 Mo | oui | Dimensions provisoires, À VÉRIFIER dans l'aide d'App Store Connect au moment de la soumission. Textes dans screenshots.json, pas dans l'image. |
| `store-screenshot-03-group.png` | 1290 × 2796 | non | 8 Mo | oui | Dimensions provisoires, À VÉRIFIER dans l'aide d'App Store Connect au moment de la soumission. Textes dans screenshots.json, pas dans l'image. |
| `store-screenshot-04-daily.png` | 1290 × 2796 | non | 8 Mo | oui | Dimensions provisoires, À VÉRIFIER dans l'aide d'App Store Connect au moment de la soumission. Textes dans screenshots.json, pas dans l'image. |
| `store-screenshot-05-reading.png` | 1290 × 2796 | non | 8 Mo | oui | Dimensions provisoires, À VÉRIFIER dans l'aide d'App Store Connect au moment de la soumission. Textes dans screenshots.json, pas dans l'image. |
| `store-screenshot-06-modes.png` | 1290 × 2796 | non | 8 Mo | oui | Dimensions provisoires, À VÉRIFIER dans l'aide d'App Store Connect au moment de la soumission. Textes dans screenshots.json, pas dans l'image. |

## Fichiers définitifs : origines et licences

| Fichier | Origine | Licence | Notes |
|---|---|---|---|
| `apps/mobile/assets/brand/brand-logo-symbol.svg` | docs/SPEC.md, Annexe C | Création interne | Annexe C.1, version sur fond sombre. |
| `apps/mobile/assets/brand/brand-logo-symbol-light.svg` | docs/SPEC.md, Annexe C | Création interne | Annexe C.2, version sur fond clair. |
| `apps/mobile/assets/brand/brand-logo-symbol-mono.svg` | docs/SPEC.md, Annexe C | Création interne | Annexe C.3, version simplifiée pour les petites tailles. |
| `apps/mobile/assets/icons/ui/icon-ui-close.svg` | https://lucide.dev (paquet lucide-static 1.78.0) | ISC | Trait ramené de 2 à 1,5. Remplaçable. |
| `apps/mobile/assets/icons/ui/icon-ui-back.svg` | https://lucide.dev (paquet lucide-static 1.78.0) | ISC | Trait ramené de 2 à 1,5. Remplaçable. |
| `apps/mobile/assets/icons/ui/icon-ui-chevron-right.svg` | https://lucide.dev (paquet lucide-static 1.78.0) | ISC | Trait ramené de 2 à 1,5. Remplaçable. |
| `apps/mobile/assets/icons/ui/icon-ui-share.svg` | https://lucide.dev (paquet lucide-static 1.78.0) | ISC | Trait ramené de 2 à 1,5. Remplaçable. |
| `apps/mobile/assets/icons/ui/icon-ui-download.svg` | https://lucide.dev (paquet lucide-static 1.78.0) | ISC | Trait ramené de 2 à 1,5. Remplaçable. |
| `apps/mobile/assets/icons/ui/icon-ui-settings.svg` | https://lucide.dev (paquet lucide-static 1.78.0) | ISC | Trait ramené de 2 à 1,5. Remplaçable. |
| `apps/mobile/assets/icons/ui/icon-ui-lock.svg` | https://lucide.dev (paquet lucide-static 1.78.0) | ISC | Trait ramené de 2 à 1,5. Remplaçable. |
| `apps/mobile/assets/icons/ui/icon-ui-plus.svg` | https://lucide.dev (paquet lucide-static 1.78.0) | ISC | Trait ramené de 2 à 1,5. Remplaçable. |
| `apps/mobile/assets/icons/ui/icon-ui-check.svg` | https://lucide.dev (paquet lucide-static 1.78.0) | ISC | Trait ramené de 2 à 1,5. Remplaçable. |
| `apps/mobile/assets/icons/ui/icon-ui-info.svg` | https://lucide.dev (paquet lucide-static 1.78.0) | ISC | Trait ramené de 2 à 1,5. Remplaçable. |
| `apps/mobile/assets/icons/ui/icon-ui-edit.svg` | https://lucide.dev (paquet lucide-static 1.78.0) | ISC | Trait ramené de 2 à 1,5. Remplaçable. |
| `apps/mobile/assets/icons/ui/icon-ui-trash.svg` | https://lucide.dev (paquet lucide-static 1.78.0) | ISC | Trait ramené de 2 à 1,5. Remplaçable. |
| `apps/mobile/assets/icons/ui/icon-ui-flag.svg` | https://lucide.dev (paquet lucide-static 1.78.0) | ISC | Trait ramené de 2 à 1,5. Remplaçable. |
| `apps/mobile/assets/icons/ui/icon-ui-bell.svg` | https://lucide.dev (paquet lucide-static 1.78.0) | ISC | Trait ramené de 2 à 1,5. Remplaçable. |
| `apps/mobile/assets/icons/ui/icon-ui-link.svg` | https://lucide.dev (paquet lucide-static 1.78.0) | ISC | Trait ramené de 2 à 1,5. Remplaçable. |
| `apps/mobile/assets/icons/ui/icon-ui-copy.svg` | https://lucide.dev (paquet lucide-static 1.78.0) | ISC | Trait ramené de 2 à 1,5. Remplaçable. |
| `apps/mobile/assets/icons/ui/icon-ui-users.svg` | https://lucide.dev (paquet lucide-static 1.78.0) | ISC | Trait ramené de 2 à 1,5. Remplaçable. |
| `apps/mobile/assets/icons/ui/icon-ui-sparkle.svg` | https://lucide.dev (paquet lucide-static 1.78.0) | ISC | Trait ramené de 2 à 1,5. Remplaçable. |
| `apps/mobile/assets/fonts/CormorantGaramond-Medium.ttf` | https://github.com/CatharsisFonts/Cormorant (fonts/ttf) | OFL-1.1 | Fichier d'origine, non modifié. |
| `apps/mobile/assets/fonts/CormorantGaramond-MediumItalic.ttf` | https://github.com/CatharsisFonts/Cormorant (fonts/ttf) | OFL-1.1 | Fichier d'origine, non modifié. |
| `apps/mobile/assets/fonts/Manrope-SemiBold.ttf` | https://github.com/google/fonts (ofl/manrope/Manrope[wght].ttf) | OFL-1.1 | Instance statique wght=600 tirée de la police variable officielle avec fontTools 4.68.0 (aucun fichier statique publié). Récupérée le 2026-11-23. |
| `apps/mobile/assets/fonts/Inter-Regular.ttf` | https://github.com/rsms/inter/releases/tag/v4.1 (extras/ttf) | OFL-1.1 | Fichier d'origine, non modifié. |
| `apps/mobile/assets/fonts/Inter-Medium.ttf` | https://github.com/rsms/inter/releases/tag/v4.1 (extras/ttf) | OFL-1.1 | Fichier d'origine, non modifié. |
