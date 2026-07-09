-- ============================================================
-- Migration 0093 — Restructuration racine (v2 - adaptée prod)
-- 
-- Structure actuelle prod :
--   ROOT (binary_right → FOUNDER001) → FOUNDER001 → ... → FOUNDER100
--
-- Résultat attendu :
--   ROOT (binary_right → LEADER) → LEADER (binary_left → FOUNDER001)
--                                         → FOUNDER001 → ... → FOUNDER100
--
-- + Réinitialisation de tous les mots de passe : Willbeleader2026!
-- ============================================================

PRAGMA foreign_keys = OFF;

-- ── 1. CRÉER LE MEMBRE LEADER (sans binary_left_id/right_id pour l'instant) ──
-- On les ajoutera après pour éviter les FK circulaires
INSERT OR IGNORE INTO members (
  id, unique_id, email, password_hash, pin_hash,
  first_name, last_name,
  member_status, current_rank,
  license_active, kyc_status, in_holding_tank,
  sponsor_id, binary_parent_id, binary_position,
  binary_left_id, binary_right_id,
  wallet_balance, credit_croissance, reserve_strategique,
  registration_method,
  created_at, updated_at
) VALUES (
  'leader-root-000000000000000000000001',
  'LEADER',
  'leader@willbeleader.com',
  'bdbfbc76-53ee-4b51-a448-e663c79b7688:1870a0c2525f796c77b806c90a4b960d1772c87cef7094deff6c4c1a56fb4b63',
  NULL,
  'LEADER', 'Network',
  'Membre', 'none',
  1, 'verified', 0,
  'root-system-000000000000000000000000',
  'root-system-000000000000000000000000', 'R',
  NULL,
  NULL,
  0, 0, 0,
  'admin',
  datetime('now'), datetime('now')
);

-- ── 2. WALLET du LEADER ───────────────────────────────────────
INSERT OR IGNORE INTO wallets (id, member_id, balance, total_earned, total_withdrawn)
VALUES (
  'wallet-leader-000000000000000000001',
  'leader-root-000000000000000000000001',
  0, 0, 0
);

-- ── 3. DREAMILES WALLET du LEADER ────────────────────────────
INSERT OR IGNORE INTO dreamiles_wallet (id, member_id, dreamiles, total_earned, total_converted, total_expired)
VALUES (
  'dreamiles-leader-00000000000000001',
  'leader-root-000000000000000000000001',
  0, 0, 0, 0
);

-- ── 4. RATTACHER FOUNDER001 sous LEADER ──────────────────────
-- FOUNDER001 (d38c6aed...) était enfant R de ROOT → devient enfant L de LEADER
UPDATE members
SET binary_parent_id = 'leader-root-000000000000000000000001',
    binary_position  = 'L',
    sponsor_id       = 'leader-root-000000000000000000000001',
    updated_at       = datetime('now')
WHERE id = 'd38c6aed-4fd9-5de9-99a2-aebb4e6a2cc7';

-- ── 5. METTRE À JOUR LEADER avec ses enfants ─────────────────
UPDATE members
SET binary_left_id = 'd38c6aed-4fd9-5de9-99a2-aebb4e6a2cc7',
    updated_at     = datetime('now')
WHERE id = 'leader-root-000000000000000000000001';

-- ── 6. METTRE À JOUR ROOT → binary_right = LEADER ────────────
UPDATE members
SET binary_right_id = 'leader-root-000000000000000000000001',
    updated_at      = datetime('now')
WHERE unique_id = 'ROOT';

-- ── 7. CHANGER LE MOT DE PASSE DE TOUS LES MEMBRES ───────────
-- Mot de passe : Willbeleader2026!
-- Hash : bdbfbc76-53ee-4b51-a448-e663c79b7688:1870a0c2525f796c77b806c90a4b960d1772c87cef7094deff6c4c1a56fb4b63
UPDATE members
SET password_hash = 'bdbfbc76-53ee-4b51-a448-e663c79b7688:1870a0c2525f796c77b806c90a4b960d1772c87cef7094deff6c4c1a56fb4b63',
    updated_at    = datetime('now')
WHERE unique_id NOT IN ('ROOT');

PRAGMA foreign_keys = ON;
