# Slumbywise · Grindleveling · Empreinte — consignes pour les agents

Ce dépôt est travaillé par deux agents : **Codex** (principal) et **Claude Code** (ponctuel), jamais en même temps.
GitHub `main` est la seule source de vérité. Les sessions se passent la main par Git et par `docs/HANDOFF.md`.

## En début de session (obligatoire)

1. `git fetch origin` puis `git status -sb`. Si la copie est en retard : `git pull --ff-only` (ou rebase de tes commits locaux sur `origin/main`). Ne jamais travailler sur une copie périmée.
2. Lire l'entrée la plus récente de `docs/HANDOFF.md` : ce que l'autre agent a fait, migrations appliquées, travail en cours.
3. Une branche non publiée de l'autre agent (ex. `codex/...`) ne se modifie pas : elle appartient à celui qui l'a créée.

## En fin de session (obligatoire)

1. Vérifier : `npx tsc --noEmit`, `npm run build`, et les `node scripts/test-*.cjs` concernés.
2. Commit, puis push sur `main` (ou merge de ta branche dans `main` à jour avec `origin/main`). Un push sur `main` déploie : ne jamais pousser un build cassé.
3. Ajouter une entrée en tête de `docs/HANDOFF.md` : date, agent, commits, migrations appliquées, points ouverts.

## Déploiement

- Netlify reconstruit automatiquement à chaque push sur `main` (`npm run build`, dossier `out/`). https://grindleveling.netlify.app et https://slumbywise.com servent le même build.
- `npm run deploy:game` est un ancien flux (copie vers le dossier du site latraction.net) : ne pas l'utiliser.

## Base Supabase (partagée, en production)

- Projet « Test », réf `zpvayrhcfrlerwxciyzr`. Les deux agents travaillent sur la même base.
- Nouvelle migration : prendre le numéro libre suivant dans `supabase/migrations/` sur `main` à jour **et** sur toute branche non publiée (des numéros ont déjà été pris en double). Migrations idempotentes (`create or replace`, `if not exists`).
- Appliquer la migration **avant** de pousser le front qui en dépend, la vérifier par une requête, puis la noter dans `docs/HANDOFF.md`.
- Le navigateur n'attribue jamais d'XP ni de résignation : tout passe par des fonctions SQL `security definer`.

## Règles métier

- Mission = quête. Projet = donjon (opération, campagne, raid, donjon, boss).
- L'avancement d'un projet vient uniquement de ses quêtes terminées (`progress_pct`, tenu par trigger SQL ; les quêtes abandonnées ne comptent pas). Les vues dérivent de `lib/engine/progress.ts`.
- La concentration (minuteur) se rattache à une mission, jamais à un projet.
- Résignation : jamais automatique, toujours après le bilan « Quelle est ton excuse ? » — échéance dépassée, ou mission démarrée non terminée dans la journée (une fois par jour, la mission reste en cours). Voir `docs/quest-deadline-review.md`.
- Rangs E → S nommés selon le MBTI (16 profils × 6 rangs) : `lib/engine/rankTitles.ts`.
- Interface en français.

## Tests

`node scripts/test-*.cjs`. Les tests SQL utilisent PGlite (`PGLITE_MODULE=<chemin du module>`), les tests navigateur Playwright (`PLAYWRIGHT_MODULE=<chemin du module>`). Ils simulent Supabase et ne touchent jamais la vraie base.
