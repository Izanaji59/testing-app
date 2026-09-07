-- =====================================================================
-- LATRACTION — Migration 0005a · Nouvelle valeur d'enum REVENU
-- =====================================================================
-- ÉTAPE 1/2. À exécuter SEULE, dans sa PROPRE query (Run), avant 0005b.
-- Postgres interdit d'utiliser une valeur d'enum tout juste ajoutée dans
-- la même transaction — il faut qu'elle soit committée d'abord.
-- Idempotent : safe à re-exécuter.
-- =====================================================================

alter type stat_kind add value if not exists 'REVENU';

-- =====================================================================
-- FIN DE LA MIGRATION 0005a — exécute 0005b dans une NOUVELLE query.
-- =====================================================================
