-- =====================================================================
-- Migration 0023a · Stat AGUERRISSEMENT (1/2 — valeur d'enum)
-- =====================================================================
-- Épreuves réelles hors de sa zone de confort : marcher 60 km, sauter en
-- parachute… À exécuter SEULE, avant 0023b (Postgres interdit d'utiliser une
-- nouvelle valeur d'enum dans la transaction qui l'ajoute).
-- =====================================================================

alter type stat_kind add value if not exists 'AGUERRISSEMENT';
