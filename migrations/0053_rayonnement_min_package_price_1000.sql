-- Migration 0053 : Corriger le seuil minimum package pour le Bonus de Rayonnement
-- Règle métier : package DÉVELOPPEMENT ($1 000) est le minimum éligible, pas PINACLE ($1 500)
-- Avant : 1499 (excluait DÉVELOPPEMENT → seuls PINACLE et INFLUENCE éligibles)
-- Après : 1000 (DÉVELOPPEMENT, PINACLE, INFLUENCE tous éligibles)

INSERT INTO bonus_config (key, value) VALUES ('rayonnement_min_package_price', '1000')
ON CONFLICT(key) DO UPDATE SET value = '1000';
