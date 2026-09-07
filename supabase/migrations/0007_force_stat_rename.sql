-- =====================================================================
-- LATRACTION — Migration 0007 · ENERGY renommée en FORCE (fusion énergie+santé)
-- =====================================================================
-- À exécuter APRÈS 0001 à 0006 dans le SQL Editor Supabase.
-- Idempotent : safe à re-exécuter (RENAME VALUE échoue silencieusement
-- si déjà fait — dans ce cas ignore l'erreur et passe à la suite).
--
-- RENAME VALUE change juste le libellé d'une valeur d'enum EXISTANTE :
-- contrairement à ADD VALUE, pas de restriction de transaction, et
-- toutes les lignes stats existantes suivent automatiquement (l'enum est
-- stocké par OID en interne, pas par le texte).
-- =====================================================================

alter type stat_kind rename value 'ENERGY' to 'FORCE';

-- =====================================================================
-- FIN DE LA MIGRATION 0007
-- =====================================================================
