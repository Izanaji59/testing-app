-- =====================================================================
-- LATRACTION — Migration 0013a · Stat RÉSIGNATION (1/2 — valeur d'enum)
-- =====================================================================
-- ÉTAPE 1/2. À exécuter dans SA PROPRE QUERY, séparément de 0013b
-- (Postgres interdit d'utiliser une nouvelle valeur d'enum dans la même
-- transaction que celle qui l'ajoute).
-- =====================================================================

alter type stat_kind add value if not exists 'RESIGNATION';
