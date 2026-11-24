# Base de règles d'interprétation — consignes de rédaction

Référence : `docs/SPEC.md` §5 (ton, sujets interdits) et §14.3 (forme d'une fiche). Statut de toutes les fiches : `draft_ai`, à relire par une astrologue (O-14).

## Fichiers

Un fichier JSON par sujet dans `content/kb/fr/` : `planet_sign.<corps>.json` (12 fiches, clés `planet_sign:<corps>:<signe>`), `asc_sign.json` (clés `asc_sign:<signe>`), `mc_sign.json` (clés `mc_sign:<signe>`). Chaque fichier est un objet `{ "<clé>": <fiche> }`. Identifiants en anglais (SPEC §3) : `sun moon mercury venus mars jupiter saturn uranus neptune pluto north_node` ; `aries taurus gemini cancer leo virgo libra scorpio sagittarius capricorn aquarius pisces`.

## Forme d'une fiche

```json
{
  "keywords": ["3 à 6 mots-clés"],
  "essence": "Une ou deux phrases neutres et impersonnelles décrivant le placement.",
  "light": ["2 à 4 forces, impersonnelles"],
  "shadow": ["2 à 4 travers, impersonnels"],
  "behaviors": ["3 à 5 comportements concrets et observables, impersonnels, à l'infinitif ou en groupe nominal"],
  "summary": { "soft": "…", "cash": "…", "expert": "…" },
  "roastAngles": { "soft": ["…"], "cash": ["…", "…"], "expert": ["…"] },
  "roastWeight": 0,
  "avoid": ["contresens ou clichés à éviter"]
}
```

## Règles (toutes contrôlées par `pnpm vitest run packages/ai/src/kb`)

- `summary` : 1 à 2 phrases, 240 caractères au plus. `roastAngles` : chaque punchline fait 40 à 120 caractères ; une en `soft`, deux en `cash`, une en `expert`.
- Adresse : `soft` et `cash` tutoient (jamais « vous ») ; `expert` vouvoie (jamais « tu », « te », « ton », « ta », « tes », « toi », « t' »). Attention : le nom commun « ton » est aussi refusé en `expert`.
- `essence`, `light`, `shadow`, `behaviors` : impersonnels, ni « tu » ni « vous ».
- Écriture épicène partout : aucun accord de genre visant la personne. Écrire « tu as du mal à lâcher », pas « tu es têtue ». Éviter « tu es + adjectif ». Pas de point médian, pas de « (e) ».
- On se moque des comportements, jamais de la personne. Une punchline `cash` est une scène concrète et reconnaissable, drôle, jamais méchante. `soft` : chaleureux, imagé. `expert` : précis, technique, posé.
- Aucune prédiction : pas de futur (« tu vas », « tu rencontreras »), pas de « bientôt », pas de date ni d'année, pas de « forcément », « c'est sûr », « promis ».
- Sujets interdits : apparence et corps (pas de « beau », « belle », « physique », « poids »), santé et mort (pas de « santé », « maladie », « anxiété », « dépression », « thérapie », « trouble », « mort », « deuil », « accident »), argent ou droit comme conseil (pas d'« investir », « avocat », « divorce »), origine, religion, orientation, politique, sexualité explicite (pas de « sexe », « sexuel »), injures (pas de « nul », « idiot », « stupide », « con »).
- Ne citer que le corps et le signe de la fiche : aucun autre nom de planète, de signe, de maison ni d'aspect, et pas le mot « rétrograde ». Les noms d'astres et de signes prennent la majuscule (« Lune », « Scorpion ») ; les mots courants en minuscules (« lion », « balance ») ne comptent pas. Les adjectifs dérivés d'une autre planète (« martien », « saturnien », « lunaire », « solaire »…) sont refusés.
- Pas d'émoji, de hashtag, de markdown, d'adresse web ; aucun chiffre.
- Guillemets français « » et apostrophe typographique ’ bienvenus ; pas de guillemets droits dans le texte.
- `roastWeight` : 0 à 3, potentiel du placement pour un roast (3 = très parlant, par exemple Lune ou Vénus dans un signe marqué ; 0 ou 1 pour les planètes lentes, générationnelles).
- Chaque fiche doit être spécifique : son texte ne doit pas pouvoir s'appliquer tel quel à un autre signe. Varier les constructions d'une fiche à l'autre ; ne jamais répéter une punchline.

## Exemple de calibrage (SPEC §5.5, Lune en Scorpion)

- soft : « Tu ressens tout, très fort, et tu gardes tout pour toi. Ce n’est pas de la froideur : c’est de la pudeur. »
- cash : « Tu dis “c’est rien” avec le dossier complet déjà archivé dans ta tête. »
- expert : « La Lune en Scorpion concentre la vie émotionnelle sur l’intime et le non-dit ; vous assimilez lentement, mais durablement. »
