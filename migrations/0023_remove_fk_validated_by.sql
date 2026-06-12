-- Migration 0023 : Supprimer les FK validated_by REFERENCES admin_users(id)
-- Cause : validated_by peut contenir n'importe quel identifiant admin
-- sans que cet ID soit nécessairement dans admin_users (sessions legacy, etc.)
-- Solution : TEXT libre sans contrainte FK

-- SQLite ne supporte pas DROP CONSTRAINT → rebuild des tables concernées

-- ── 1. package_orders ────────────────────────────────────────
PRAGMA foreign_keys=OFF;

CREATE TABLE package_orders_new (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  member_id TEXT NOT NULL REFERENCES members(id),
  package_id TEXT NOT NULL REFERENCES packages(id),
  amount_usd REAL NOT NULL,
  bv_value REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','proof_submitted','validated','rejected','cancelled')),
  payment_method TEXT NOT NULL DEFAULT 'manual',
  paypal_order_id TEXT,
  proof_url TEXT,
  validated_by TEXT,
  validated_at TEXT,
  rejection_reason TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  admin_fee_amount REAL NOT NULL DEFAULT 0,
  product_type TEXT NOT NULL DEFAULT 'package' CHECK(product_type IN ('package','license','package_with_license','upgrade')),
  upgrade_from_package_id TEXT REFERENCES package_orders(id),
  upgrade_diff_amount REAL DEFAULT NULL,
  upgrade_diff_bv REAL DEFAULT NULL,
  bv_propagated INTEGER NOT NULL DEFAULT 0,
  bv_snapshot REAL DEFAULT NULL,
  activation_done INTEGER DEFAULT 0,
  is_first_package INTEGER DEFAULT 0,
  price_usd REAL DEFAULT NULL,
  linked_license_id TEXT DEFAULT NULL
);
INSERT INTO package_orders_new SELECT * FROM package_orders;
DROP TABLE package_orders;
ALTER TABLE package_orders_new RENAME TO package_orders;

-- ── 2. finstrategia_licenses ─────────────────────────────────
CREATE TABLE finstrategia_licenses_new (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  member_id TEXT NOT NULL REFERENCES members(id),
  price_usd REAL NOT NULL DEFAULT 97,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','proof_submitted','validated','rejected','active','expired','cancelled')),
  payment_method TEXT NOT NULL DEFAULT 'manual',
  paypal_order_id TEXT,
  proof_url TEXT,
  validated_by TEXT,
  validated_at TEXT,
  starts_at TEXT,
  expires_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO finstrategia_licenses_new SELECT * FROM finstrategia_licenses;
DROP TABLE finstrategia_licenses;
ALTER TABLE finstrategia_licenses_new RENAME TO finstrategia_licenses;

-- ── 3. bv_logs — corriger la référence à package_orders ──────
CREATE TABLE bv_logs_new (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL REFERENCES members(id),
  source_member_id TEXT REFERENCES members(id),
  bv_amount REAL NOT NULL,
  bv_type TEXT NOT NULL CHECK(bv_type IN (
    'package_purchase','license_renewal','personal',
    'personal_purchase','propagated'
  )),
  package_order_id TEXT REFERENCES package_orders(id),
  propagated INTEGER NOT NULL DEFAULT 0,
  period TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO bv_logs_new SELECT * FROM bv_logs;
DROP TABLE bv_logs;
ALTER TABLE bv_logs_new RENAME TO bv_logs;

PRAGMA foreign_keys=ON;
