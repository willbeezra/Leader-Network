-- Migration 0054 : Remettre le seuil rayonnement_min_package_price à 1499 (PINACLE minimum)
-- Annule la migration 0053 qui avait baissé à 1000 par erreur d'analyse

INSERT INTO bonus_config (key, value) VALUES ('rayonnement_min_package_price', '1499')
ON CONFLICT(key) DO UPDATE SET value = '1499';
