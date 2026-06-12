-- Migration 0021 : admin_fee_mode dans compensation_config
-- 'once'     = frais prélevés une seule fois par compte (défaut)
-- 'multiple' = frais prélevés à chaque achat

INSERT OR IGNORE INTO compensation_config (id, key, value, updated_at)
VALUES (lower(hex(randomblob(16))), 'admin_fee_mode', 'once', datetime('now'));

-- Migration 0021b : colonne linked_license_id dans package_orders
-- Stocke l'ID de la licence finstrategia commandée en même temps qu'un package
ALTER TABLE package_orders ADD COLUMN linked_license_id TEXT DEFAULT NULL;
