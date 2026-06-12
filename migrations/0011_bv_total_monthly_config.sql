-- Migration 0011 : Cumul BV à Vie & Mensuel — CDC v1
-- Ajoute la configuration du mode BV pour les rangs (total vs mensuel)
-- et les paramètres de validation mensuelle

-- 1. Colonne bv_rank_use_total sur rank_config
--    true  = rangs calculés sur left_bv_total / right_bv_total (défaut CDC)
--    false = rangs calculés sur left_bv_monthly / right_bv_monthly
ALTER TABLE rank_config ADD COLUMN bv_rank_use_total INTEGER NOT NULL DEFAULT 1;

-- 2. Nouvelles clés compensation_config pour la validation mensuelle BV
INSERT OR IGNORE INTO compensation_config (id, key, value) VALUES
  (lower(hex(randomblob(16))), 'monthly_validation_bv_min',     '300'),
  (lower(hex(randomblob(16))), 'monthly_validation_clients_min', '1'),
  (lower(hex(randomblob(16))), 'bv_rank_global_use_total',       'true');

-- 3. Index pour optimiser les requêtes de recalcul de rang
CREATE INDEX IF NOT EXISTS idx_members_bv_total ON members(left_bv_total, right_bv_total);
CREATE INDEX IF NOT EXISTS idx_members_bv_monthly ON members(left_bv_monthly, right_bv_monthly);
