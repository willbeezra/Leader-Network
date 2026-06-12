-- Migration 0015 : Pending Wallet complet + rank_achieved_at
-- Toutes les commissions passent par pending_balance
-- Déblocage : 14j après rang + M+1

-- 1. Date d'obtention du rang (pour calcul délai 14j)
ALTER TABLE members ADD COLUMN rank_achieved_at TEXT DEFAULT NULL;

-- 2. Table de suivi des versements pending → balance
-- Remplace commission_queue pour ALL commission types
CREATE TABLE IF NOT EXISTS pending_wallet_entries (
  id                TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  member_id         TEXT NOT NULL REFERENCES members(id),
  commission_id     TEXT REFERENCES commissions(id),
  commission_type   TEXT NOT NULL,
  period            TEXT NOT NULL,           -- période de calcul ex: 2026-05
  total_amount      REAL NOT NULL DEFAULT 0, -- montant total à verser
  amount_per_day    REAL NOT NULL DEFAULT 0, -- montant journalier (total / jours_mois)
  days_in_month     INTEGER NOT NULL DEFAULT 30,
  days_paid         INTEGER NOT NULL DEFAULT 0,
  -- Date à partir de laquelle on peut commencer à payer (M+1 ET +14j)
  eligible_date     TEXT NOT NULL,           -- date réelle de début versement
  start_date        TEXT NOT NULL,           -- 1er du mois M+1 (pour affichage)
  rank_achieved_at  TEXT,                    -- snapshot date rang au moment du calcul
  status            TEXT NOT NULL DEFAULT 'pending_release'
                    CHECK(status IN ('pending_release','active','completed','cancelled')),
  created_at        TEXT DEFAULT (datetime('now')),
  last_paid_at      TEXT DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_pwe_member    ON pending_wallet_entries(member_id);
CREATE INDEX IF NOT EXISTS idx_pwe_status    ON pending_wallet_entries(status);
CREATE INDEX IF NOT EXISTS idx_pwe_eligible  ON pending_wallet_entries(eligible_date);
