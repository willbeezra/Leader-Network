-- ============================================================
-- LEADER Network — Migration 0006
-- Correction des clés étrangères vers commissions_old (supprimée)
-- La migration 0003 a renommé puis supprimé commissions_old,
-- mais les tables credit_croissance, commission_queue et
-- reserve_strategique gardaient des FK vers cette table fantôme.
-- Cette migration les remplace par des FK vers commissions.
-- ============================================================

PRAGMA foreign_keys = OFF;

-- ── 1. commission_queue ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS commission_queue_v6 (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  member_id       TEXT NOT NULL REFERENCES members(id),
  period          TEXT NOT NULL,
  commission_id   TEXT REFERENCES commissions(id),        -- FK corrigée
  commission_type TEXT NOT NULL DEFAULT 'prime_leadership',
  amount_per_day  REAL NOT NULL DEFAULT 0,
  total_amount    REAL NOT NULL DEFAULT 0,
  days_in_month   INTEGER NOT NULL DEFAULT 30,
  days_paid       INTEGER NOT NULL DEFAULT 0,
  start_date      TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'active'
                  CHECK(status IN ('active','completed','cancelled')),
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  processed_at    TEXT
);

INSERT OR IGNORE INTO commission_queue_v6
  SELECT id, member_id, period,
         NULL AS commission_id,     -- reset FK invalide
         commission_type, amount_per_day, total_amount,
         days_in_month, days_paid, start_date, status,
         created_at, processed_at
  FROM commission_queue;

DROP TABLE commission_queue;
ALTER TABLE commission_queue_v6 RENAME TO commission_queue;

-- ── 2. credit_croissance ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS credit_croissance_v6 (
  id                   TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  member_id            TEXT NOT NULL REFERENCES members(id),
  amount               REAL NOT NULL,
  period               TEXT NOT NULL,
  source_commission_id TEXT REFERENCES commissions(id),   -- FK corrigée
  status               TEXT NOT NULL DEFAULT 'held'
                       CHECK(status IN ('held','used')),
  created_at           TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO credit_croissance_v6
  SELECT id, member_id, amount, period,
         NULL AS source_commission_id,   -- reset FK invalide
         status, created_at
  FROM credit_croissance;

DROP TABLE credit_croissance;
ALTER TABLE credit_croissance_v6 RENAME TO credit_croissance;

-- ── 3. reserve_strategique ────────────────────────────────────
CREATE TABLE IF NOT EXISTS reserve_strategique_v6 (
  id                   TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  member_id            TEXT NOT NULL REFERENCES members(id),
  amount               REAL NOT NULL,
  period               TEXT NOT NULL,
  source_commission_id TEXT REFERENCES commissions(id),   -- FK corrigée
  locked_until         TEXT NOT NULL,
  abondement_rate      REAL NOT NULL DEFAULT 0.10,
  status               TEXT NOT NULL DEFAULT 'locked'
                       CHECK(status IN ('locked','released','forfeited','unlocked')),
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  unlocked_at          TEXT
);

INSERT OR IGNORE INTO reserve_strategique_v6
  SELECT id, member_id, amount, period,
         NULL AS source_commission_id,  -- reset FK invalide
         locked_until, abondement_rate, status, created_at, unlocked_at
  FROM reserve_strategique;

DROP TABLE reserve_strategique;
ALTER TABLE reserve_strategique_v6 RENAME TO reserve_strategique;

PRAGMA foreign_keys = ON;

-- ── 4. INDEX recréés ──────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_comm_queue_status ON commission_queue(status);
CREATE INDEX IF NOT EXISTS idx_comm_queue_member ON commission_queue(member_id);
CREATE INDEX IF NOT EXISTS idx_credit_croissance_member ON credit_croissance(member_id);
CREATE INDEX IF NOT EXISTS idx_reserve_strategique_status ON reserve_strategique(status);
CREATE INDEX IF NOT EXISTS idx_reserve_strategique_locked_until ON reserve_strategique(locked_until);
