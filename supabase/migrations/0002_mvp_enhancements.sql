-- =====================================================================
-- LATRACTION — Migration 0002 · MVP enhancements
-- =====================================================================
-- À exécuter APRÈS 0001_init.sql dans le SQL Editor Supabase.
-- Idempotent : safe à re-exécuter.
-- =====================================================================

-- ----------------------------------------------------------------------
-- 1. Activer Realtime sur les tables clés
--    (nécessaire pour que XpToaster et les hooks Realtime reçoivent des events)
-- ----------------------------------------------------------------------
do $$
begin
  alter publication supabase_realtime add table public.xp_events;
exception when others then null; end $$;

do $$
begin
  alter publication supabase_realtime add table public.profiles;
exception when others then null; end $$;

do $$
begin
  alter publication supabase_realtime add table public.stats;
exception when others then null; end $$;

do $$
begin
  alter publication supabase_realtime add table public.quests;
exception when others then null; end $$;

do $$
begin
  alter publication supabase_realtime add table public.projects;
exception when others then null; end $$;

do $$
begin
  alter publication supabase_realtime add table public.tasks;
exception when others then null; end $$;

-- ----------------------------------------------------------------------
-- 2. Valeurs XP simplifiées (remplace 0001)
--    easy: 5 · normal: 15 · hard: 30 · epic: 60 · legendary: 150
-- ----------------------------------------------------------------------
create or replace function f_base_xp_for_tier(t difficulty_tier)
returns int language sql immutable as $$
  select case t
    when 'TRIVIAL'   then 5
    when 'ROUTINE'   then 15
    when 'NOTABLE'   then 30
    when 'HARD'      then 60
    when 'LEGENDARY' then 150
  end
$$;

-- ----------------------------------------------------------------------
-- 3. Trigger projet terminé → 100 XP bonus
-- ----------------------------------------------------------------------
create or replace function trg_on_project_completed()
returns trigger language plpgsql as $$
begin
  if new.status = 'COMPLETED' and (old.status is null or old.status <> 'COMPLETED') then
    new.completed_at := coalesce(new.completed_at, now());
    -- 100 XP flat, attribué à la stat primaire du projet (ou null si non définie)
    perform award_xp(new.user_id, 'ADJUSTMENT', new.id, new.primary_stat, 100, false, null);
  end if;
  return new;
end;
$$;

drop trigger if exists project_completed on public.projects;
create trigger project_completed
before update on public.projects
for each row execute function trg_on_project_completed();

-- =====================================================================
-- FIN DE LA MIGRATION 0002
-- =====================================================================
