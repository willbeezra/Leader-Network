-- Migration 0014 : Supprimer la contrainte CHECK restrictive sur payment_method
-- La contrainte CHECK(payment_method IN ('paypal','manual')) empêchait les paiements
-- par virement bancaire ('bank'), crypto, wallet, etc.

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
  validated_by TEXT REFERENCES admin_users(id),
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
  price_usd REAL DEFAULT NULL
);

INSERT INTO package_orders_new SELECT
  id, member_id, package_id, amount_usd, bv_value, status, payment_method,
  paypal_order_id, proof_url, validated_by, validated_at, rejection_reason,
  created_at, updated_at, admin_fee_amount, product_type, upgrade_from_package_id,
  upgrade_diff_amount, upgrade_diff_bv, bv_propagated, bv_snapshot, activation_done,
  is_first_package, NULL as price_usd
FROM package_orders;

DROP TABLE package_orders;
ALTER TABLE package_orders_new RENAME TO package_orders;

PRAGMA foreign_keys=ON;
