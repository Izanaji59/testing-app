-- =====================================================================
-- LATRACTION — Migration 0006 · Projets : objectif hebdo, plus un "gain"
-- =====================================================================
-- À exécuter APRÈS 0001 à 0005 dans le SQL Editor Supabase.
-- Idempotent : safe à re-exécuter.
--
-- Correction : un projet qui se termine avec reward_eur déclenchait SON
-- PROPRE gain XP-REVENU, en plus de celui déjà compté par chacune de ses
-- quêtes — double comptage. C'est la quête qui rapporte, pas le projet.
-- Le champ devient un objectif hebdomadaire (cible, pas un gain) : simple
-- renommage, aucune perte de donnée sur les valeurs déjà saisies.
-- =====================================================================

alter table public.projects
  rename column reward_eur to weekly_target_eur;

-- Retire l'attribution REVENU sur completion de projet (redondante avec
-- celle des quêtes). Le reste de la fonction est identique à 0001/0002.
create or replace function trg_on_project_completed()
returns trigger language plpgsql as $$
begin
  if new.status = 'COMPLETED' and (old.status is null or old.status <> 'COMPLETED') then
    new.completed_at := coalesce(new.completed_at, now());
    perform award_xp(new.user_id, 'ADJUSTMENT', new.id, new.primary_stat, 100, false, null);
  end if;
  return new;
end;
$$;

-- =====================================================================
-- FIN DE LA MIGRATION 0006
-- =====================================================================
