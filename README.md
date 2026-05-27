# LATRACTION — App V1

Centre de commandement personnel · Next.js 14 + Supabase + Tailwind + Framer Motion.

Cible de déploiement : **`latraction.net/game`** (sous-route du site Netlify existant), via static export.

---

## Stack

| Brique | Choix | Pourquoi |
|---|---|---|
| Framework | Next.js 14 (App Router) | DX, conventions claires, build statique possible |
| Build | `output: 'export'` | déploiement statique dans le Netlify existant |
| Style | Tailwind v3 + styles inline depuis `lib/tokens.ts` | Identité HUD = styles inline pixel-précis, Tailwind en appoint |
| Auth/DB/RT | Supabase | tout en client-side, RLS-protégé |
| Animations | Framer Motion | spec exige `[0.22, 1, 0.36, 1]` |
| Data | SWR + Supabase realtime | revalidation auto + stream xp_events |

---

## Démarrage local

```bash
cd latraction-app
npm install
cp .env.local.example .env.local
# remplir NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY
npm run dev
# → http://localhost:3000/game
```

## Setup Supabase

1. Créer un projet sur https://supabase.com
2. SQL Editor → coller le contenu de `supabase/migrations/0001_init.sql`
3. Auth → Email → activer **Magic link**
4. Auth → URL Configuration → **Site URL** = `https://latraction.net/game` (et `http://localhost:3000/game` en dev) ; **Redirect URLs** = `https://latraction.net/game/auth/callback/`
5. Récupérer `URL` + `anon key` → coller dans `.env.local`

## Architecture des dossiers

```
latraction-app/
├── app/
│   ├── (auth)/login + /auth/callback        — auth magic link
│   ├── (app)/                               — routes authentifiées
│   │   ├── cmd/         ← dashboard (briefing + status)
│   │   ├── quests/      ← quest log + create
│   │   ├── donjon/      ← 5 types de projets
│   │   ├── stats/       ← radar + détail 9 stats
│   │   ├── profile/     ← identité, spec, MBTI
│   │   ├── calendar/    ← grille mensuelle des quêtes
│   │   └── roadmap/     ← trajectoire de rang + phases produit
│   ├── layout.tsx + globals.css
│   └── page.tsx (redirect)
├── components/
│   ├── hud/             ← primitives HUD (panel, brackets, radar...)
│   ├── core/            ← cartes métier (briefing, quête, projet)
│   │   └── project-types/  ← 5 vues par type de projet
│   ├── motion/          ← animations (xp burst, level up, rank up, crit)
│   └── shell/           ← tab bar, header, toaster XP
├── lib/
│   ├── tokens.ts        ← identité visuelle (single source of truth)
│   ├── types.ts         ← types TS alignés sur le schéma SQL
│   ├── supabase/        ← client browser
│   ├── engine/          ← xp, rank, difficulty, stats, specs, skills
│   └── ai/              ← signaux + adaptations
├── hooks/
│   ├── useProfile / useStats   ← profil + 9 stats + realtime
│   ├── useQuests               ← quêtes + createQuestFlash()
│   ├── useProjects             ← projets
│   ├── useXpStream             ← stream realtime xp_events
│   └── useTodayBriefing        ← briefing du jour
├── supabase/migrations/        ← schéma complet (DDL + RLS + triggers)
└── scripts/build-deploy.mjs    ← copie out/ → ../deploy.../game/
```

## Déploiement vers latraction.net/game

```bash
npm run deploy:game
```

Ce script :
1. Lance `next build` (génère le dossier `out/`)
2. Copie `out/` → `<../../deploy-69b2220d883ee2298d02d348>/game/`
3. Te rappelle d'ajouter une ligne au `_redirects` Netlify pour le SPA fallback

Le site nettoyage à la racine n'est **pas touché**.

## Concepts clés

- **Source de vérité = SQL.** Le client ne *décide* jamais d'un gain XP. Il *observe* via Supabase Realtime.
- **`award_xp()`** est la seule fonction qui crée des XP. Anti-grind + diversité + crit y sont appliqués.
- **3 quêtes/jour max** côté UI — choix philosophique, pas technique.
- **Pas de notifications push.** Spec interdit.
- **Pas de localStorage critique.** Tout passe par Supabase pour la cohérence multi-appareil.

## Quoi est prêt en V1, quoi reste à V2

✅ V1 livrée ici : 8 écrans · 5 types de projets · 9 stats · 7 rangs · 7 specs · arbres de compétences · IA adaptative (7 signaux) · animations cinématiques · todolist sous quêtes · calendrier · roadmap

🔜 V2 : couche LLM pour les briefings narratifs, multi-spec, boss à phases déblocables, intégrations passives (Calendar, Health, GitHub).

---

> Source de vérité produit : `../LATRACTION_SYSTEM_MASTER.md`.
> Lire ce doc avant toute modification structurelle.
