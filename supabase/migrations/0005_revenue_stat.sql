-- =====================================================================
-- LATRACTION — Migration 0005 · Stat REVENU (10e axe) + confidentialité stats
-- =====================================================================
-- À exécuter APRÈS 0001, 0002, 0003, 0004 dans le SQL Editor Supabase.
-- Idempotent : safe à re-exécuter.
--
-- Le montant exact en € reste privé (visible uniquement par le joueur sur
-- son propre /profile, calculé côté client via RLS owner-only existant).
-- Ce qui devient visible des AUTRES joueurs, c'est uniquement le NIVEAU de
-- la stat REVENU — jamais l'XP brute, jamais un montant. get_public_stats
-- est donc resserrée pour ne plus renvoyer que (kind, level), pour les 10
-- stats, pas seulement REVENU.
-- =====================================================================

-- ----------------------------------------------------------------------
-- 1. Nouveau stat_kind.
-- ----------------------------------------------------------------------
alter type stat_kind add value if not exists 'REVENU';

-- ----------------------------------------------------------------------
-- 2. Rétro-création de la ligne REVENU pour les comptes déjà existants
--    (le trigger de bootstrap ne s'exécute qu'à la création du profil).
-- ----------------------------------------------------------------------
insert into public.stats (user_id, kind)
select user_id, 'REVENU' from public.profiles
on conflict do nothing;

-- ----------------------------------------------------------------------
-- 3. Trigger quête terminée : ajoute l'attribution XP → REVENU si
--    reward_eur > 0. 1€ = 1 XP, même courbe de palier que les autres stats.
-- ----------------------------------------------------------------------
create or replace function trg_on_quest_completed()
returns trigger language plpgsql as $$
declare
  v_base_xp     int;
  v_stat        stat_kind;
  v_crit_chance numeric;
  v_is_crit     boolean := false;
  v_crit_mult   numeric;
begin
  if new.status = 'COMPLETED' and (old.status is null or old.status <> 'COMPLETED') then
    new.completed_at := coalesce(new.completed_at, now());

    v_base_xp := f_base_xp_for_tier(coalesce(new.difficulty_tier, 'ROUTINE'));

    v_crit_chance := case new.difficulty_tier
      when 'TRIVIAL'   then 0.00
      when 'ROUTINE'   then 0.02
      when 'NOTABLE'   then 0.05
      when 'HARD'      then 0.08
      when 'LEGENDARY' then 0.15
      else 0.02
    end;

    if random() < v_crit_chance then
      v_is_crit := true;
      v_crit_mult := 1.5 + random();
      if random() < 0.05 then v_crit_mult := 3.0; end if;
    end if;

    if new.reward_stats is not null and array_length(new.reward_stats, 1) > 0 then
      foreach v_stat in array new.reward_stats loop
        perform award_xp(new.user_id, 'QUEST_COMPLETE', new.id, v_stat, v_base_xp, v_is_crit, v_crit_mult);
      end loop;
    else
      perform award_xp(new.user_id, 'QUEST_COMPLETE', new.id, null, v_base_xp, v_is_crit, v_crit_mult);
    end if;

    if new.reward_eur is not null and new.reward_eur > 0 then
      perform award_xp(new.user_id, 'ADJUSTMENT', new.id, 'REVENU', round(new.reward_eur)::int, false, null);
    end if;
  end if;

  return new;
end;
$$;

-- ----------------------------------------------------------------------
-- 4. Trigger projet terminé : même ajout.
-- ----------------------------------------------------------------------
create or replace function trg_on_project_completed()
returns trigger language plpgsql as $$
begin
  if new.status = 'COMPLETED' and (old.status is null or old.status <> 'COMPLETED') then
    new.completed_at := coalesce(new.completed_at, now());
    perform award_xp(new.user_id, 'ADJUSTMENT', new.id, new.primary_stat, 100, false, null);

    if new.reward_eur is not null and new.reward_eur > 0 then
      perform award_xp(new.user_id, 'ADJUSTMENT', new.id, 'REVENU', round(new.reward_eur)::int, false, null);
    end if;
  end if;
  return new;
end;
$$;

-- ----------------------------------------------------------------------
-- 5. get_public_stats resserrée : uniquement (kind, level), plus jamais
--    l'XP brute — s'applique aux 10 stats, pas seulement REVENU.
-- ----------------------------------------------------------------------
drop function if exists public.get_public_stats(uuid);

create or replace function public.get_public_stats(target_user uuid)
returns table (
  kind  stat_kind,
  level int
)
language sql
security definer
set search_path = public
stable
as $$
  select kind, level from public.stats where user_id = target_user;
$$;

revoke all on function public.get_public_stats(uuid) from public;
grant execute on function public.get_public_stats(uuid) to authenticated;

-- =====================================================================
-- FIN DE LA MIGRATION 0005
-- =====================================================================
