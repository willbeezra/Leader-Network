-- ============================================================
-- LEADER Network — Migration 0004 (réécrite idempotente)
-- Correctifs plan de compensation
-- ============================================================

-- ── 1. TABLE monthly_validations (B7 — verrou anti-double-calcul) ─
CREATE TABLE IF NOT EXISTS monthly_validations (
  id               TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  member_id        TEXT NOT NULL REFERENCES members(id),
  period           TEXT NOT NULL,
  processed_at     TEXT NOT NULL DEFAULT (datetime('now')),
  leadership_prime REAL NOT NULL DEFAULT 0,
  influence_bonus  REAL NOT NULL DEFAULT 0,
  rayonnement_bonus REAL NOT NULL DEFAULT 0,
  UNIQUE(member_id, period)
);
CREATE INDEX IF NOT EXISTS idx_monthly_validations_period ON monthly_validations(period);
CREATE INDEX IF NOT EXISTS idx_monthly_validations_member ON monthly_validations(member_id);

-- ── 2. WALLETS — pending_balance (W1) ────────────────────────
ALTER TABLE wallets ADD COLUMN pending_balance REAL NOT NULL DEFAULT 0;
ALTER TABLE wallets ADD COLUMN last_daily_transfer_date TEXT;

-- ── 3. RESERVE_STRATEGIQUE — unlocked_at ─────────────────────
ALTER TABLE reserve_strategique ADD COLUMN unlocked_at TEXT;

-- ── 4. RANK_QUEUE — attempts + last_error (W2) ───────────────
ALTER TABLE rank_queue ADD COLUMN attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE rank_queue ADD COLUMN last_error TEXT;

-- ── 5. INDEX COMPLÉMENTAIRES ─────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_commissions_member_period_type ON commissions(member_id, period, type);
CREATE INDEX IF NOT EXISTS idx_commission_queue_status ON commission_queue(status);
CREATE INDEX IF NOT EXISTS idx_commission_queue_member ON commission_queue(member_id);
CREATE INDEX IF NOT EXISTS idx_reserve_strategique_locked_until ON reserve_strategique(locked_until);
CREATE INDEX IF NOT EXISTS idx_reserve_strategique_status ON reserve_strategique(status);
CREATE INDEX IF NOT EXISTS idx_credit_croissance_member ON credit_croissance(member_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(status);
