-- =====================================================================
-- LATRACTION — Migration 0011 · Modèles de missions personnalisables
-- =====================================================================
-- À exécuter APRÈS 0001 à 0010 dans le SQL Editor Supabase.
-- Idempotent : safe à re-exécuter.
--
-- Bibliothèque de modèles de missions par stat, gérée par chaque joueur
-- (ex: "Faire 100 pompes" → FORCE). Sert de source de suggestions :
--   - à la création d'une quête (bouton "Suggère-moi une mission")
--   - dans le briefing du matin (missions proposées selon le focus du jour)
-- =====================================================================

create table if not exists public.mission_templates (
  id                uuid primary key default uuid_generate_v4(),
  user_id           uuid not null references public.profiles(user_id) on delete cascade,
  title             text not null,
  description       text,
  stat_kind         stat_kind not null,
  difficulty_tier   difficulty_tier not null default 'ROUTINE',
  estimated_minutes int not null default 30 check (estimated_minutes between 5 and 120),
  created_at        timestamptz not null default now()
);
create index if not exists idx_mission_templates_user_stat on public.mission_templates(user_id, stat_kind);

alter table public.mission_templates enable row level security;

drop policy if exists "mission_templates_select" on public.mission_templates;
drop policy if exists "mission_templates_insert" on public.mission_templates;
drop policy if exists "mission_templates_update" on public.mission_templates;
drop policy if exists "mission_templates_delete" on public.mission_templates;

create policy "mission_templates_select" on public.mission_templates
  for select using (auth.uid() = user_id);

create policy "mission_templates_insert" on public.mission_templates
  for insert with check (auth.uid() = user_id);

create policy "mission_templates_update" on public.mission_templates
  for update using (auth.uid() = user_id);

create policy "mission_templates_delete" on public.mission_templates
  for delete using (auth.uid() = user_id);

-- =====================================================================
-- FIN DE LA MIGRATION 0011
-- =====================================================================
