-- ============================================================
-- LEADER Network — Migration 0024
-- Ajouter 'fast_start_contribution' au CHECK constraint bv_type
-- ============================================================

PRAGMA foreign_keys = OFF;

CREATE TABLE IF NOT EXISTS bv_logs_new (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL REFERENCES members(id),
  source_member_id TEXT REFERENCES members(id),
  bv_amount REAL NOT NULL,
  bv_type TEXT NOT NULL CHECK(bv_type IN (
    'package_purchase','license_renewal','personal',
    'personal_purchase','propagated','fast_start_contribution'
  )),
  package_order_id TEXT REFERENCES package_orders(id),
  propagated INTEGER NOT NULL DEFAULT 0,
  period TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO bv_logs_new SELECT * FROM bv_logs;

DROP TABLE bv_logs;
ALTER TABLE bv_logs_new RENAME TO bv_logs;

CREATE INDEX IF NOT EXISTS idx_bv_logs_member ON bv_logs(member_id);
CREATE INDEX IF NOT EXISTS idx_bv_logs_period ON bv_logs(period);
CREATE INDEX IF NOT EXISTS idx_bv_logs_order ON bv_logs(package_order_id);

PRAGMA foreign_keys = ON;
