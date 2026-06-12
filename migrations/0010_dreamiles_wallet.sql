-- ============================================================
-- MIGRATION 0010 : Wallet Luxia (Dreamiles) + colonnes packages
-- Date : 2026-05-07
-- ============================================================

-- 1. Table principale dreamiles_wallet (solde par membre)
CREATE TABLE IF NOT EXISTS dreamiles_wallet (
  id              TEXT PRIMARY KEY,
  member_id       TEXT NOT NULL UNIQUE,
  dreamiles       INTEGER NOT NULL DEFAULT 0,   -- points disponibles (non convertis)
  total_earned    INTEGER NOT NULL DEFAULT 0,   -- total cumulé historique
  total_converted INTEGER NOT NULL DEFAULT 0,   -- total converti en USD
  total_expired   INTEGER NOT NULL DEFAULT 0,   -- total expiré
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (member_id) REFERENCES members(id)
);

-- 2. Table historique des mouvements Dreamiles
CREATE TABLE IF NOT EXISTS dreamiles_transactions (
  id              TEXT PRIMARY KEY,
  member_id       TEXT NOT NULL,
  type            TEXT NOT NULL,  -- 'credit' | 'conversion' | 'expiry' | 'withdrawal'
  dreamiles       INTEGER NOT NULL DEFAULT 0,  -- positif = crédit, négatif = débit
  usd_amount      REAL NOT NULL DEFAULT 0,     -- montant USD équivalent (1 DRM = 1$)
  description     TEXT,
  package_order_id TEXT,          -- référence commande source
  expires_at      DATETIME,       -- date d'expiration (24 mois après crédit)
  status          TEXT NOT NULL DEFAULT 'completed',
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (member_id) REFERENCES members(id)
);

-- 3. Ajouter colonnes manquantes à packages
ALTER TABLE packages ADD COLUMN payment_mode TEXT NOT NULL DEFAULT 'one_time';
-- 'one_time' = paiement unique | 'subscription' = abonnement mensuel

ALTER TABLE packages ADD COLUMN dreamiles_per_payment INTEGER NOT NULL DEFAULT 0;
-- Nombre de dreamiles crédités à chaque paiement (0 = pas de dreamiles, ex Luxia)

ALTER TABLE packages ADD COLUMN bv_per_payment REAL NOT NULL DEFAULT 0;
-- BV crédités à chaque paiement mensuel (pour abonnements)

-- Index
CREATE INDEX IF NOT EXISTS idx_dreamiles_tx_member ON dreamiles_transactions(member_id);
CREATE INDEX IF NOT EXISTS idx_dreamiles_tx_expires ON dreamiles_transactions(expires_at);
