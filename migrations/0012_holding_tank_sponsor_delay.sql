-- Migration 0012 : Holding Tank — délégation différée au parrain
-- Le parrain a la main pendant N jours (défaut 15), ensuite l'admin peut placer

-- 1. Ajouter le paramètre de délai dans compensation_config
INSERT OR IGNORE INTO compensation_config (id, key, value, updated_at)
VALUES ('cfg-ht-sponsor-days', 'holding_tank_sponsor_days', '15', datetime('now'));

-- 2. Enrichir la table holding_tank avec des métadonnées utiles
ALTER TABLE holding_tank ADD COLUMN sponsor_deadline_at DATETIME;
ALTER TABLE holding_tank ADD COLUMN admin_can_place INTEGER NOT NULL DEFAULT 0;
-- placed_by already exists in 0001_initial_schema.sql
-- placed_at already exists in 0001_initial_schema.sql
-- ALTER TABLE holding_tank ADD COLUMN placed_at DATETIME;
ALTER TABLE holding_tank ADD COLUMN sponsor_notified INTEGER NOT NULL DEFAULT 0;

-- 3. Calculer la deadline pour les entrées existantes (15j depuis création)
UPDATE holding_tank
SET sponsor_deadline_at = datetime(created_at, '+15 days'),
    admin_can_place     = CASE WHEN datetime(created_at, '+15 days') < datetime('now') THEN 1 ELSE 0 END
WHERE status = 'waiting';

-- 4. Index pour accélérer les requêtes de délai
CREATE INDEX IF NOT EXISTS idx_holding_tank_deadline ON holding_tank(sponsor_deadline_at);
CREATE INDEX IF NOT EXISTS idx_holding_tank_status   ON holding_tank(status);
