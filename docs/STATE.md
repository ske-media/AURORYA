# État du projet

Mis à jour : 2026-11-23, fin de T-001.

## Fait
- **T-001** — Monorepo pnpm, `CLAUDE.md` (copie du §1.8), fichiers vivants, lint avec frontières entre paquets, contrôle de secrets, CI minimale, versions verrouillées.
  Vérifié dans la session : `pnpm lint`, `pnpm typecheck`, `pnpm test` (13 tests) passent.
- `docs/SPEC.md` : copie à l'octet près du texte fourni par le fondateur (extraite du journal de session, sans retranscription).

## Non fait dans T-001
- La CI (`.github/workflows/ci.yml`) n'a jamais tourné : les versions des actions GitHub ne sont pas vérifiées. À contrôler à la première demande de fusion.
- `.claude/rules/` et `.claude/agents/relecteur.md` (facultatifs, §1.8) ne sont pas créés.
- Les commandes de `CLAUDE.md` autres que `typecheck`, `lint`, `test` n'existent pas encore (elles arrivent avec leurs tickets).
- `apps/mobile` et `apps/web` sont des squelettes sans Expo ni Next.js (T-003, T-008, T-009).

## Prochaine action
T-002 : `packages/shared` (identifiants canoniques, tokens avec la direction d'ADR-007, test de contraste), polices, logos de l'Annexe C, registre des fichiers visuels.
Avant de créer le registre : faire valider les identifiants de la famille de photos célestes (ADR-007).

## Bloqué, en attente d'un fondateur
- Comptes à ouvrir : Supabase, Vercel (offre payante), Expo/EAS, puis RevenueCat, Sentry, Resend, fournisseur d'IA.
- Soumission à Apple : structure juridique (O-05), domaine (O-06), disponibilité du nom (O-01), textes légaux relus.

## Pièges découverts
- TypeScript 7.0.2 est la dernière version, mais `typescript-eslint` 8.73.0 exige `<6.1.0` : TypeScript est verrouillé en 6.0.3.
- La session de travail distante impose la branche `claude/hopeful-fermat-ttya03`, et non `feat/T-001-…` comme le prévoit le §1.5.
- `.claude/settings.json` refuse la lecture des `.env*` réels mais laisse `.env.example` lisible.
