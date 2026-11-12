# Journal de passation

Entrée la plus récente en haut. Une entrée par session : date, agent, commits, migrations appliquées, points ouverts.

## 2026-11-12 — Claude Code, emplacement « lien ou lecteur » pour Allflix

- Demande refusée : scraper le site Darlav et mettre ses liens sur chaque film (streaming non autorisé : copies de films du commerce intégrées depuis des hébergeurs de fichiers, pop-ups). Règle ajoutée dans `AGENTS.md`.
- Ajouté à la place, sur le modèle du module streaming de TechBeme/Allflix : une fonction Netlify `netlify/functions/playback.mjs` qui interroge une API de lecture externe avec sa clé côté serveur et renvoie `{ type: video|embed|link, url, label? }` (HTTPS seulement). `netlify.toml` déclare le dossier des fonctions.
- Fiche Allflix : `playback.json` reste prioritaire, puis l'API si `NEXT_PUBLIC_ALLFLIX_PLAYBACK_API=on` au build, sinon « Lecture à venir ». Helper `playbackApiUrl` dans `lib/allflix/types.ts`.
- **Inactif** : aucune variable n'est configurée sur Netlify ; l'utilisateur attend une clé d'API. Activation et contrat décrits dans `docs/allflix.md` (« Brancher une API de lecture »). Tests : `scripts/test-playback-api.cjs`.
- Point ouvert : quand la clé arrive, vérifier que la source est autorisée, adapter `resolvePlayback` si le format de l'API diffère, définir les 3 variables Netlify et redéployer.

## 2026-11-03 — Claude Code, personnages typés MBTI (V1)

Demande de l'utilisateur : un équivalent de PDB (personnages de fiction typés MBTI / ennéagramme) intégré à Allflix, alimenté par un programme d'import qui tourne en local. Choix de l'utilisateur : **typage éditorial uniquement** (pas de votes pour l'instant), TMDB + AniList comme sources. Extraction de PDB / Boo refusée (droit des bases de données) : règle ajoutée dans `AGENTS.md`.

**Ajouté** (basé sur `3c2133d`, rien de ta fusion n'est modifié)
- Pages publiques `/personnages/` (filtre par type, `?type=INTJ`) et `/personnages/fiche/?id=…` : `components/characters/*`, `app/personnages/*`, logique et validation dans `lib/characters.ts`.
- `components/allflix/Allflix.tsx` : `Frame` exporté (+ prop `extraCredit` pour le crédit AniList), lien « Personnages » dans la navigation, rangée `TitleCharacters` en bas de chaque fiche.
- Import : `npm run characters:import` (`scripts/import-characters.mjs`, clé TMDB de `.env.local`, AniList sans clé, ~30 req/min). Données générées et publiées : `public/characters/index.json` (747 personnages, 40 œuvres via TMDB, 40 animés via AniList, 30 personnages partagés entre deux œuvres), `typings.json` (747 entrées vides, à remplir par l'utilisateur), `sources.json` (correspondance forcée pour le film Chainsaw Man).
- Tests : `scripts/test-characters.cjs`, aussi lancé par `npm run characters:check` pour valider les typages saisis. Doc : `docs/personnages.md`.
- Aucune migration, aucune donnée Supabase : tout est statique. Prochain numéro de migration libre : toujours `0021`.

**Points ouverts**
- L'utilisateur remplit `public/characters/typings.json` ; vérifier avec `npm run characters:check` avant de publier.
- Pistes V2 évoquées : votes de la communauté (pondérés par le MBTI calibré du votant), vote par fonctions cognitives, noms français des personnages d'animés, pages indexables (rendu serveur), « personnages de ton type » sur le profil.
- Le titre français TMDB de `tmdb-movie-81` est « Le Vaisseau fantôme » alors que l'œuvre est Nausicaä : la correspondance AniList est juste, le libellé du catalogue Allflix est à corriger à la source.
- Vérifié dans le navigateur intégré (dev, build de production local et site public) : liste, filtre par type, fiche personnage, rangée sur la fiche Allflix, crédit AniList. Un test Playwright des pages personnages dans ta suite reste bienvenu.
- **Corrigé (touchait tout le site)** : Netlify injecte désormais dans `<head>`, juste après `<meta charSet>`, un saut de ligne et un commentaire promotionnel (`This site is hosted on Netlify… utm_source=ai-legible`) absents du build. React 18.3 (vendu par Next 14) hydrate tout le document : erreur #418 (écart d'hydratation), puis #423 (repli en rendu client), et parfois #329 (« Unknown root exit status ») qui laissait des pages bloquées sur « Chargement… » (Allflix, fiches). Aucun réglage Netlify connu pour le désactiver. Correctif : script inline en tête de `app/layout.tsx` qui retire ces nœuds pendant l'analyse du HTML, avant React. Reproduit puis vérifié localement avec un serveur qui imite l'injection : plus aucune erreur sur `/chess/`, `/allflix/`, `/personnages/`. Une mise à jour vers Next 15 / React 19 (hydratation du `<head>` tolérante) rendrait ce script inutile.

## 2026-11-03 — Codex, vérification finale et synchronisation

- Fusion de `origin/main` (`0e1548f`) dans `codex/slumbywise-logo`, en conservant la suppression des quêtes, le bilan quotidien et les numéros de migration 0018–0020. Le test Allflix conserve le sélecteur de titre principal corrigé dans `2e236a7`.
- Évite deux bilans pour une mission datée : son échéance pilote le bilan ; le bilan quotidien concerne les missions démarrées sans échéance. Une échéance future ne déclenche donc pas de bilan anticipé.
- Vérifications réussies après fusion : TypeScript, build des 30 routes, tests SQL échéances / progression / concentration et tests navigateur des bilans, des erreurs réseau, de la suppression confirmée ou annulée et de sa protection pour les quêtes terminées. Comptes simulés uniquement.
- Les tests navigateur Allflix, profils, concentration et mobile avaient déjà réussi sur les composants conservés par la fusion. Allflix contient 80 fiches et leurs épisodes ; les liens vidéo restent à renseigner dans `public/allflix/playback.json`. La clé TMDB reste exclusivement dans `.env.local`, ignoré par Git.
- Aucune nouvelle migration exécutée : 0016–0020 sont déjà appliquées selon la passation et les vérifications précédentes. Prochain numéro libre : 0021.
- Cette fusion termine le lot Carnet/Livre, profils et journal, progression, concentration par quête et catalogue Allflix. Publication sur `main`, puis contrôle du site public.

## 2026-11-02 (soir) — Claude Code

- Suppression d'une quête : bouton « SUPPRIMER » avec confirmation sur `components/core/QuestCard.tsx`, pour toute quête non terminée. Une quête terminée ne se supprime pas (son XP est acquise et elle compte dans l'avancement du donjon).
- Aucune migration : la RLS `quests_delete` et les clés étrangères existaient déjà (tâches et bilans supprimés en cascade, sessions de concentration conservées avec `quest_id` à null). Le trigger d'avancement recalcule le donjon.
- Supprimer n'ajoute pas de résignation, contrairement à l'abandon (SKIPPED). Non testé dans un navigateur connecté (pas de test Playwright disponible ici).

## 2026-11-02 (après-midi) — Claude Code, fusion du travail de Codex

À la demande de l'utilisateur, la branche locale `codex/slumbywise-logo` (commits `7842b98` et `8115faa`) **et** ses modifications non commitées du moment (import en double retiré dans `components/core/QuestCard.tsx`, nouveau `scripts/test-allflix-browser.cjs`) ont été fusionnées dans `main` et publiées. La copie de travail de Codex n'a pas été modifiée.

**Pour Codex, à la reprise**
- Ta branche est entièrement contenue dans `main`. Tes deux modifications locales y sont à l'identique : `git stash -u`, `git checkout main` (ou merge de `origin/main` dans ta branche), `git pull`, puis `git stash drop` si rien d'autre n'était en cours.
- Tes migrations ont été **renumérotées** (fichiers seulement, déjà appliquées en base, ne pas relancer) : `0016_quest_focus` → `0018_quest_focus`, `0017_progression` → `0019_progression`, `0018_profile_journal` → `0020_profile_journal`. Références mises à jour dans `scripts/test-quest-focus-sql.cjs`, `scripts/test-progression-sql.cjs` et `docs/grind-focus.md`. Prochain numéro libre : `0021`.
- Conflits résolus : `lib/quest-review.ts` (tes `localDayDeadline` / `questsForToday` + le bilan des missions démarrées) et `components/core/DeadlineReview.tsx` (ta resynchronisation d'horloge et l'alerte de chargement + le bilan quotidien). Ta concentration par quête (`save_quest_focus`) est conservée telle quelle.
- La formule de niveaux du front est maintenant alignée sur `0019_progression` (point ouvert précédent résolu).

## 2026-11-02 — Claude Code

**Publié sur `main` (en ligne)**
- `80fba30` Titres de rang selon le MBTI ; avancement des donjons calculé depuis les quêtes ; concentration rattachée aux missions.
- `fbb48d0` Bilan quotidien des missions démarrées non terminées : « Quelle est ton excuse ? », résignation = XP de base de la quête si évitement volontaire, la mission reste en cours.
- `AGENTS.md`, `CLAUDE.md` et ce journal.

**Migrations appliquées sur Supabase**
- `0016_project_progress_from_quests.sql` et `0017_started_quest_daily_review.sql` (fichiers sur `main`).

**Points ouverts — pour Codex** (tous traités par la fusion ci-dessus)
- La branche locale `codex/slumbywise-logo` (2 commits non publiés : concentration par quête, progression, journal personnel, catalogue Allflix) contient `80fba30` mais pas `fbb48d0`. Avant de pousser : merger `origin/main` en gardant le bilan quotidien (`components/core/DeadlineReview.tsx`, `lib/quest-review.ts`, `supabase/migrations/0017_started_quest_daily_review.sql`).
- Numéros de migration en double : `main` a `0016_project_progress_from_quests` et `0017_started_quest_daily_review` ; la branche Codex a `0016_quest_focus`, `0017_progression` et `0018_profile_journal`. Toutes sont **déjà appliquées** en base : au merge, renuméroter les fichiers de la branche (0018, 0019, 0020) sans relancer leur SQL.
- Les migrations Codex 0016 → 0018 sont en base alors que leur front n'est pas en ligne : la formule des niveaux (`0017_progression`) diffère de `lib/engine/xp.ts` sur `main` jusqu'au merge, les barres d'XP en ligne peuvent être approximatives.
- Concentration : la branche Codex a sa propre version par quête (RPC `save_quest_focus`). Elle peut remplacer celle de `main` (`components/focus/FocusProvider.tsx`, bouton « Me concentrer » des cartes de quête) au moment du merge.
