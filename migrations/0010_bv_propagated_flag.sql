-- ============================================================
-- LEADER Network — Migration 0010
-- CDC BV — Ajout bv_propagated sur package_orders
-- + package_order_id sur bv_logs pour traçabilité complète
-- ============================================================

PRAGMA foreign_keys = OFF;

-- ── 1. bv_propagated sur package_orders ─────────────────────
-- Flag d'idempotence : mis à 1 après propagation BV complète
ALTER TABLE package_orders ADD COLUMN bv_propagated INTEGER NOT NULL DEFAULT 0;

-- ── 2. package_order_id sur bv_logs ─────────────────────────
-- Lien vers la commande source pour traçabilité et reconstruction
ALTER TABLE package_orders ADD COLUMN bv_snapshot REAL DEFAULT NULL;

-- ── 3. Index ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_pkg_orders_bv_propagated ON package_orders(bv_propagated, status);
CREATE INDEX IF NOT EXISTS idx_bv_logs_order ON bv_logs(package_order_id);

PRAGMA foreign_keys = ON;
