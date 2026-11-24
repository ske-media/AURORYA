# Du dépôt à l'app sur ton iPhone

Marche à suivre pour le premier build de développement. À faire dans l'ordre. Les étapes 1 et 3 se font sur ta machine ou dans les consoles ; l'étape 2 peut être faite par Claude Code une fois le projet Supabase créé.

## 1. Créer le projet Supabase

1. Dans l'organisation « Fjord&Apps », créer un projet nommé `aurorya`, région **Francfort (eu-central-1)**. Noter le mot de passe de la base.
2. Authentication → Providers : activer **Anonymous sign-ins**. Laisser **Email** activé.
3. Authentication → Rate limits : garder la limite de connexions anonymes par adresse IP.
4. Relever dans Project Settings :
   - l'URL du projet (`https://<ref>.supabase.co`) ;
   - la clé publique (`anon` ou `publishable`) ;
   - la clé `service_role` (secrète) ;
   - la chaîne de connexion du **pooler en mode transaction** (Connect → Transaction pooler).

## 2. Remplir la base et brancher le serveur

Depuis le dépôt, avec `DATABASE_URL` valant la chaîne de connexion **directe** (ou session pooler) :

```sh
for f in supabase/migrations/*.sql; do psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f"; done
pnpm kb:seed && psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/seed/kb.v1.sql
pnpm questions:seed && psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/seed/questions.sql
pnpm geo:build && pnpm geo:load          # 162 000 villes, environ une minute
```

Variables d'environnement du projet Vercel `aurorya` (équipe SKE), pour Production et Preview :

| Nom | Valeur | Secret |
|---|---|---|
| `DATABASE_URL` | chaîne du pooler en mode transaction | oui |
| `SUPABASE_URL` | URL du projet | non |
| `SUPABASE_SERVICE_ROLE_KEY` | clé `service_role` | oui |
| `PUBLIC_SITE_URL` | adresse publique du site, sans barre finale | non |

Puis redéployer.

**Point bloquant à trancher** : le projet Vercel a la « protection des déploiements » activée, donc toute adresse `*.vercel.app` exige une connexion Vercel. L'app mobile ne pourra pas appeler l'API tant qu'il n'y a pas soit un nom de domaine relié au projet (O-06), soit cette protection désactivée pour la production.

## 3. Build de développement iOS

Prérequis : un compte Expo, le compte développeur Apple, l'iPhone sous la main.

```sh
cd apps/mobile
npx eas-cli@latest login
npx eas-cli@latest init                      # crée le projet EAS ; reporter l'identifiant affiché dans app.config.ts (extra.eas.projectId)
npx eas-cli@latest device:create             # enregistre l'iPhone (lien à ouvrir sur le téléphone)
npx eas-cli@latest env:create --environment development --name EXPO_PUBLIC_API_BASE_URL --value https://<adresse-du-site> --visibility plaintext
npx eas-cli@latest env:create --environment development --name EXPO_PUBLIC_SUPABASE_URL --value https://<ref>.supabase.co --visibility plaintext
npx eas-cli@latest env:create --environment development --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value <clé publique> --visibility plaintext
# Facultatif : le domaine écrit sous « Fais le tien » sur la carte. Sans lui, la ligne n'est pas dessinée.
npx eas-cli@latest env:create --environment development --name EXPO_PUBLIC_SITE_HOST --value aurorya.vercel.app --visibility plaintext
npx eas-cli@latest build -p ios --profile development
```

Au premier build, EAS demande la connexion au compte Apple (avec double authentification) pour créer le certificat et le profil : c'est le moment où l'identifiant `com.aurorya.app` est enregistré chez Apple, de façon définitive (ADR-003).

Une fois l'app installée : `npx expo start --dev-client` depuis `apps/mobile`, puis ouvrir l'app sur l'iPhone.

## 4. Ce qu'il faut vérifier sur l'appareil

Rien de l'interface n'a encore tourné sur un iPhone. À dérouler et à rapporter :

1. Les cinq écrans d'onboarding, la recherche de ville, le sélecteur de date.
2. Le calcul puis la révélation du roast, et le changement de ton.
3. La roue : lisibilité des glyphes (provisoires), sélection d'une planète, bascule en liste.
4. La page du jour et la question.
5. Création du compte par e-mail (code reçu), puis création d'un groupe, invitation, adhésion depuis un second profil.
6. Suppression du compte.

## 5. TestFlight, ensuite

`npx eas-cli@latest build -p ios --profile production --auto-submit-with-profile production` — seulement quand l'étape 4 est propre, et pas avant : compte App Store Connect prêt, fiche de confidentialité, et les prérequis de `docs/SPEC.md` Annexe D.
