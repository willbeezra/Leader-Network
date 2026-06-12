-- Migration 0047 : Ajouter 'cancelled' au CHECK constraint de reserve_strategique.status
-- Le code mlm.ts utilise status='cancelled' pour annuler les RS lors d'un upgrade de rang
-- mais le schéma (migration 0006) ne l'autorisait pas → SQLITE_CONSTRAINT_CHECK error

-- SQLite ne supporte pas ALTER CONSTRAINT directement
-- On recrée la table avec la nouvelle contrainte

PRAGMA foreign_keys = OFF;

CREATE TABLE IF NOT EXISTS reserve_strategique_v47 (
  id                   TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  member_id            TEXT NOT NULL REFERENCES members(id),
  amount               REAL NOT NULL,
  period               TEXT NOT NULL,
  source_commission_id TEXT REFERENCES commissions(id),
  locked_until         TEXT NOT NULL,
  abondement_rate      REAL NOT NULL DEFAULT 0.10,
  status               TEXT NOT NULL DEFAULT 'locked'
                       CHECK(status IN ('locked','released','forfeited','unlocked','cancelled')),
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  unlocked_at          TEXT
);

INSERT OR IGNORE INTO reserve_strategique_v47
  SELECT id, member_id, amount, period,
         source_commission_id,
         locked_until, abondement_rate, status, created_at, unlocked_at
  FROM reserve_strategique;

DROP TABLE reserve_strategique;
ALTER TABLE reserve_strategique_v47 RENAME TO reserve_strategique;

-- Recréer les index
CREATE INDEX IF NOT EXISTS idx_reserve_strategique_member ON reserve_strategique(member_id);
CREATE INDEX IF NOT EXISTS idx_reserve_strategique_period ON reserve_strategique(period);
CREATE INDEX IF NOT EXISTS idx_reserve_strategique_status ON reserve_strategique(status);

PRAGMA foreign_keys = ON;
