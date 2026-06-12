-- ============================================================
-- LEADER Network — Migration 0007
-- 3 Méthodes d'inscription (M1/M2/M3)
-- Ajout colonnes binary_left_id, binary_right_id, registration_method
-- Ajout membre ROOT (racine de l'arbre binaire)
-- ============================================================

PRAGMA foreign_keys = OFF;

-- ── 1. Colonnes sur members ───────────────────────────────────
-- SQLite ne supporte pas IF NOT EXISTS sur ALTER TABLE
-- On utilise une approche sécurisée : les colonnes sont ajoutées
-- et si elles existent déjà, on ignore l'erreur via un script wrapper.
-- Pour wrangler, on utilise des instructions séparées et on accepte l'erreur silencieusement.

ALTER TABLE members ADD COLUMN binary_left_id TEXT REFERENCES members(id);
ALTER TABLE members ADD COLUMN binary_right_id TEXT REFERENCES members(id);
ALTER TABLE members ADD COLUMN registration_method TEXT DEFAULT 'M1';

-- ── 2. Membre ROOT — Racine immuable de l'arbre binaire ───────
-- unique_id = 'ROOT', ne reçoit aucune commission
INSERT OR IGNORE INTO members (
  id, unique_id, email, password_hash, pin_hash,
  first_name, last_name,
  member_status, current_rank,
  license_active, license_expires_at,
  kyc_status,
  in_holding_tank,
  binary_parent_id, binary_position,
  wallet_balance, credit_croissance, reserve_strategique,
  registration_method,
  created_at, updated_at
) VALUES (
  'root-system-000000000000000000000000',
  'ROOT',
  'root@leader-network.system',
  'not-a-real-hash',
  'not-a-real-pin',
  'ROOT',
  'System',
  'AMI',
  'none',
  1,
  NULL,
  'verified',
  0,
  NULL, NULL,
  0, 0, 0,
  'admin',
  datetime('now'), datetime('now')
);

-- Créer wallet pour ROOT (obligatoire pour les JOIN)
INSERT OR IGNORE INTO wallets (id, member_id, balance, total_earned, total_withdrawn)
VALUES ('wallet-root-000000000000000000000', 'root-system-000000000000000000000000', 0, 0, 0);

PRAGMA foreign_keys = ON;

-- ── 3. Index utiles ───────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_members_unique_id ON members(unique_id);
CREATE INDEX IF NOT EXISTS idx_members_binary_left ON members(binary_left_id);
CREATE INDEX IF NOT EXISTS idx_members_binary_right ON members(binary_right_id);
CREATE INDEX IF NOT EXISTS idx_members_registration ON members(registration_method);
