-- =====================================================================
-- LATRACTION — Migration 0012 · Progression des projets (donjons, etc.)
-- =====================================================================
-- À exécuter APRÈS 0001 à 0011 dans le SQL Editor Supabase.
-- Idempotent : safe à re-exécuter.
--
-- BUG CORRIGÉ : rien ne mettait jamais à jour projects.progress_pct ni
-- projects.hp_remaining quand une quête change de statut — ces colonnes
-- restaient figées à leur valeur de création, donc les barres de
-- progression (donjons, boss) n'avançaient jamais.
--
-- Ce trigger recalcule, à chaque insert/update/delete d'une quête :
--   - progress_pct = % de quêtes du projet au statut COMPLETED
--   - hp_remaining = hp_total réduit dans la même proportion (type BOSS)
-- Un backfill en fin de migration corrige aussi les projets existants.
-- =====================================================================

create or replace function f_recompute_project_progress(p_project_id uuid)
returns void language plpgsql as $$
declare
  v_hp_total    int;
  v_total_q     int;
  v_completed_q int;
begin
  if p_project_id is null then return; end if;

  select count(*), count(*) filter (where status = 'COMPLETED')
    into v_total_q, v_completed_q
    from public.quests
   where project_id = p_project_id;

  select hp_total into v_hp_total from public.projects where id = p_project_id;

  update public.projects
     set progress_pct = least(100, round(100.0 * v_completed_q / greatest(v_total_q, 1), 2)),
         hp_remaining = case
           when v_hp_total is not null
           then greatest(0, v_hp_total - round(v_hp_total::numeric * v_completed_q / greatest(v_total_q, 1)))
           else hp_remaining
         end
   where id = p_project_id;
end;
$$;

create or replace function trg_on_quest_progress_change()
returns trigger language plpgsql as $$
begin
  if TG_OP = 'DELETE' then
    perform f_recompute_project_progress(old.project_id);
    return old;
  end if;

  perform f_recompute_project_progress(new.project_id);

  if TG_OP = 'UPDATE' and old.project_id is distinct from new.project_id then
    perform f_recompute_project_progress(old.project_id);
  end if;

  return new;
end;
$$;

drop trigger if exists quest_progress_change on public.quests;
create trigger quest_progress_change
after insert or update or delete on public.quests
for each row execute function trg_on_quest_progress_change();

-- ----------------------------------------------------------------------
-- Backfill : recalcule tout de suite les projets existants (donjons
-- avec des quêtes déjà terminées mais une progression restée à 0).
-- ----------------------------------------------------------------------
do $$
declare r record;
begin
  for r in select id from public.projects loop
    perform f_recompute_project_progress(r.id);
  end loop;
end $$;

-- =====================================================================
-- FIN DE LA MIGRATION 0012
-- =====================================================================
