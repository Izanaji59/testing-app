# Journal de passation

Entrée la plus récente en haut. Une entrée par session : date, agent, commits, migrations appliquées, points ouverts.

## 2026-11-02 — Claude Code

**Publié sur `main` (en ligne)**
- `80fba30` Titres de rang selon le MBTI ; avancement des donjons calculé depuis les quêtes ; concentration rattachée aux missions.
- `fbb48d0` Bilan quotidien des missions démarrées non terminées : « Quelle est ton excuse ? », résignation = XP de base de la quête si évitement volontaire, la mission reste en cours.
- `AGENTS.md`, `CLAUDE.md` et ce journal.

**Migrations appliquées sur Supabase**
- `0016_project_progress_from_quests.sql` et `0017_started_quest_daily_review.sql` (fichiers sur `main`).

**Points ouverts — pour Codex**
- La branche locale `codex/slumbywise-logo` (2 commits non publiés : concentration par quête, progression, journal personnel, catalogue Allflix) contient `80fba30` mais pas `fbb48d0`. Avant de pousser : merger `origin/main` en gardant le bilan quotidien (`components/core/DeadlineReview.tsx`, `lib/quest-review.ts`, `supabase/migrations/0017_started_quest_daily_review.sql`).
- Numéros de migration en double : `main` a `0016_project_progress_from_quests` et `0017_started_quest_daily_review` ; la branche Codex a `0016_quest_focus`, `0017_progression` et `0018_profile_journal`. Toutes sont **déjà appliquées** en base : au merge, renuméroter les fichiers de la branche (0018, 0019, 0020) sans relancer leur SQL.
- Les migrations Codex 0016 → 0018 sont en base alors que leur front n'est pas en ligne : la formule des niveaux (`0017_progression`) diffère de `lib/engine/xp.ts` sur `main` jusqu'au merge, les barres d'XP en ligne peuvent être approximatives.
- Concentration : la branche Codex a sa propre version par quête (RPC `save_quest_focus`). Elle peut remplacer celle de `main` (`components/focus/FocusProvider.tsx`, bouton « Me concentrer » des cartes de quête) au moment du merge.
