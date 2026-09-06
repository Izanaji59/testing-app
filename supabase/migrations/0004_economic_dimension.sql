-- =====================================================================
-- LATRACTION — Migration 0004 · Dimension économique (€) par quête/projet
-- =====================================================================
-- À exécuter APRÈS 0001, 0002, 0003 dans le SQL Editor Supabase.
-- Idempotent : safe à re-exécuter.
--
-- Montant en euros, saisi manuellement à la création d'une quête ou d'un
-- projet (0 par défaut = ne rapporte rien). Volontairement une colonne
-- numeric simple pour l'instant — pas de devise/table de conversion tant
-- que le multi-devise n'est pas un besoin réel (prévu plus tard).
-- =====================================================================

alter table public.quests
  add column if not exists reward_eur numeric(10,2) not null default 0 check (reward_eur >= 0);

alter table public.projects
  add column if not exists reward_eur numeric(10,2) not null default 0 check (reward_eur >= 0);

-- =====================================================================
-- FIN DE LA MIGRATION 0004
-- =====================================================================
