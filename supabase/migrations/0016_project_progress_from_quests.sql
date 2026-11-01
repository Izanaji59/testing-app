-- =====================================================================
-- LATRACTION — Migration 0015 · Avancement des donjons piloté par les quêtes
-- =====================================================================
-- À exécuter APRÈS 0001 à 0014 dans le SQL Editor Supabase.
-- Idempotent : safe à re-exécuter.
--
-- PROBLÈME : des donjons restaient à 0 %, d'autres affichaient 100 %.
--   1. Les vues Donjon / Campagne / Opération lisaient phase_current et
--      phase_count (1 / 1 par défaut, jamais mis à jour) : un donjon sans
--      aucune quête terminée s'affichait "1/1 salles explorées".
--   2. Les quêtes abandonnées (SKIPPED) restaient dans le dénominateur :
--      un donjon ne pouvait plus atteindre 100 %.
--
-- RÈGLE : l'avancement d'un projet ne dépend QUE de ses quêtes (missions).
--   progress_pct = quêtes COMPLETED / quêtes non abandonnées
-- Le front dérive désormais toutes ses vues de progress_pct ; phase_current
-- et hp_remaining sont resynchronisés ici pour rester cohérents.
-- =====================================================================

create or replace function f_recompute_project_progress(p_project_id uuid)
returns void language plpgsql as $$
declare
  v_hp_total    int;
  v_phases      int;
  v_total_q     int;
  v_completed_q int;
  v_pct         numeric;
begin
  if p_project_id is null then return; end if;

  select count(*) filter (where status <> 'SKIPPED'),
         count(*) filter (where status = 'COMPLETED')
    into v_total_q, v_completed_q
    from public.quests
   where project_id = p_project_id;

  select hp_total, greatest(coalesce(phase_count, 1), 1)
    into v_hp_total, v_phases
    from public.projects
   where id = p_project_id;

  v_pct := least(100, round(100.0 * v_completed_q / greatest(v_total_q, 1), 2));

  update public.projects
     set progress_pct  = v_pct,
         phase_current = case
           when v_pct >= 100 then v_phases
           else least(v_phases, floor(v_phases * v_pct / 100)::int + 1)
         end,
         hp_remaining  = case
           when v_hp_total is not null
           then greatest(0, v_hp_total - round(v_hp_total::numeric * v_pct / 100))
           else hp_remaining
         end
   where id = p_project_id;
end;
$$;

-- Le trigger de 0012 (quest_progress_change) appelle déjà cette fonction à
-- chaque insert / update / delete de quête : rien à recréer.

-- Backfill : recalcule tous les projets existants.
do $$
declare r record;
begin
  for r in select id from public.projects loop
    perform f_recompute_project_progress(r.id);
  end loop;
end $$;

-- =====================================================================
-- FIN DE LA MIGRATION 0015
-- =====================================================================
