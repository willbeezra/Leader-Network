-- Migration 0035 : Ajout du toggle rétroactivité intra-mois
-- Valeur par défaut 'true' : comportement rétroactif activé dès le déploiement

INSERT INTO bonus_config (key, value, description)
VALUES (
  'retroactivite_intra_mois_enabled',
  'true',
  'Rétroactivité intra-mois : quand activé, un membre qui upgrade son package en cours de mois reçoit immédiatement les bonus de filleuls qualifiés plus tôt dans ce mois (conditions BV mensuel et parrainage ignorées pour le recalcul)'
)
ON CONFLICT(key) DO UPDATE SET
  description = excluded.description
  -- Ne pas écraser la valeur si déjà configurée manuellement
;
