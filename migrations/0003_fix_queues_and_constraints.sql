-- ============================================================
-- Migration 0003 — Correction des tables queue et contraintes
-- Alignement avec mlm.ts (CDC v6.0)
-- ============================================================

-- ── 1. BV_QUEUE : colonnes manquantes ──────────────────────
ALTER TABLE bv_queue ADD COLUMN package_order_id TEXT;
ALTER TABLE bv_queue ADD COLUMN period TEXT DEFAULT '';
ALTER TABLE bv_queue ADD COLUMN last_error TEXT;

-- ── 2. COMMISSION_QUEUE : recréer avec la bonne structure ──
-- SQLite ne supporte pas DROP COLUMN ou ALTER COLUMN
-- On renomme l'ancienne, crée la nouvelle, drop l'ancienne
ALTER TABLE commission_queue RENAME TO commission_queue_old;

CREATE TABLE commission_queue (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  member_id       TEXT NOT NULL REFERENCES members(id),
  period          TEXT NOT NULL,
  commission_id   TEXT REFERENCES commissions(id),
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

DROP TABLE commission_queue_old;

-- ── 3. RANK_QUEUE : ajouter trigger_event ──────────────────
ALTER TABLE rank_queue ADD COLUMN trigger_event TEXT DEFAULT 'manual';

-- ── 4. BV_LOGS : permettre personal_purchase ───────────────
-- SQLite ne peut pas modifier un CHECK — on recrée la table
ALTER TABLE bv_logs RENAME TO bv_logs_old;

CREATE TABLE bv_logs (
  id               TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  member_id        TEXT NOT NULL REFERENCES members(id),
  source_member_id TEXT REFERENCES members(id),
  bv_amount        REAL NOT NULL,
  bv_type          TEXT NOT NULL CHECK(bv_type IN (
    'package_purchase','license_renewal','personal','personal_purchase','propagated'
  )),
  package_order_id TEXT REFERENCES package_orders(id),
  propagated       INTEGER NOT NULL DEFAULT 0,
  period           TEXT NOT NULL,
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO bv_logs SELECT
  id, member_id, source_member_id, bv_amount,
  CASE WHEN bv_type = 'personal' THEN 'personal_purchase' ELSE bv_type END,
  package_order_id, propagated, period, created_at
FROM bv_logs_old;

DROP TABLE bv_logs_old;

-- ── 5. COMMISSIONS : ajouter statuts non_withdrawable/locked ─
ALTER TABLE commissions RENAME TO commissions_old;

CREATE TABLE commissions (
  id               TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  member_id        TEXT NOT NULL REFERENCES members(id),
  type             TEXT NOT NULL CHECK(type IN (
    'prime_leadership','bonus_influence','bonus_rayonnement',
    'valorisation_recommandation','fast_start',
    'credit_croissance','reserve_strategique','admin_credit'
  )),
  amount           REAL NOT NULL,
  description      TEXT,
  period           TEXT,
  source_member_id TEXT REFERENCES members(id),
  rank_at_time     TEXT,
  status           TEXT NOT NULL DEFAULT 'pending' CHECK(status IN (
    'pending','approved','paid','cancelled','non_withdrawable','locked'
  )),
  paid_at          TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO commissions SELECT * FROM commissions_old;
DROP TABLE commissions_old;

-- ── 6. Recréer index essentiels ────────────────────────────
CREATE INDEX IF NOT EXISTS idx_bv_logs_member    ON bv_logs(member_id);
CREATE INDEX IF NOT EXISTS idx_bv_logs_period    ON bv_logs(period);
CREATE INDEX IF NOT EXISTS idx_bv_queue_status   ON bv_queue(status);
CREATE INDEX IF NOT EXISTS idx_comm_queue_status ON commission_queue(status);
CREATE INDEX IF NOT EXISTS idx_rank_queue_status ON rank_queue(status);
CREATE INDEX IF NOT EXISTS idx_commissions_member ON commissions(member_id);
CREATE INDEX IF NOT EXISTS idx_commissions_period ON commissions(period);
CREATE INDEX IF NOT EXISTS idx_commissions_status ON commissions(status);
