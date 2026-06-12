-- ═══════════════════════════════════════════════════════════════════════
-- Migration 0065 — Synchronisation schéma production
-- ═══════════════════════════════════════════════════════════════════════

-- Colonnes manquantes dans members
ALTER TABLE members ADD COLUMN preferred_lang TEXT NOT NULL DEFAULT 'fr';
ALTER TABLE members ADD COLUMN profile_photo TEXT DEFAULT NULL;
ALTER TABLE members ADD COLUMN vdi_consent INTEGER NOT NULL DEFAULT 0;
ALTER TABLE members ADD COLUMN vdi_consent_at TEXT DEFAULT NULL;
ALTER TABLE members ADD COLUMN vdi_mandate_signed INTEGER DEFAULT 0;
ALTER TABLE members ADD COLUMN vdi_mandate_signed_at TEXT DEFAULT NULL;
ALTER TABLE members ADD COLUMN account_status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE members ADD COLUMN package_grace_ends_at TEXT DEFAULT NULL;
ALTER TABLE members ADD COLUMN wallet_frozen INTEGER NOT NULL DEFAULT 0;
ALTER TABLE members ADD COLUMN cancelled_at TEXT DEFAULT NULL;

-- Colonnes manquantes dans package_orders (package_expires_at déjà présente)
ALTER TABLE package_orders ADD COLUMN expiry_email_sent INTEGER DEFAULT 0;

-- Colonne manquante dans wallet_topups
ALTER TABLE wallet_topups ADD COLUMN legacy_method TEXT DEFAULT NULL;

-- Table member_cards
CREATE TABLE member_cards (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  member_id TEXT NOT NULL REFERENCES members(id),
  design TEXT NOT NULL DEFAULT 'A' CHECK(design IN ('A','B')),
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','revoked')),
  token TEXT UNIQUE NOT NULL,
  issued_at TEXT NOT NULL DEFAULT (datetime('now')),
  revoked_at TEXT DEFAULT NULL,
  card_config_json TEXT NOT NULL DEFAULT '{}'
);

-- Table physical_card_orders
CREATE TABLE physical_card_orders (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  member_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  amount REAL NOT NULL DEFAULT 19.90,
  currency TEXT NOT NULL DEFAULT 'USD',
  payment_method TEXT,
  payment_ref TEXT,
  shipping_address TEXT,
  tracking_number TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
