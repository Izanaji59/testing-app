-- =====================================================================
-- LATRACTION — Migration 0008 · MENTAL_RESISTANCE renommée en MENTALITE
-- =====================================================================
-- À exécuter APRÈS 0001 à 0007 dans le SQL Editor Supabase.
-- Idempotent : safe à re-exécuter.
--
-- Fusion mentalité + résilience (déjà ce que couvrait MENTAL_RESISTANCE :
-- "surmonter échec, persister, sortir de zone de confort"). RENAME VALUE,
-- pas add+drop : les lignes stats existantes suivent automatiquement.
-- =====================================================================

alter type stat_kind rename value 'MENTAL_RESISTANCE' to 'MENTALITE';

-- =====================================================================
-- FIN DE LA MIGRATION 0008
-- =====================================================================
