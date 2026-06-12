-- Migration 0017 : ajout colonne badge_url dans rank_config
ALTER TABLE rank_config ADD COLUMN badge_url TEXT DEFAULT NULL;
