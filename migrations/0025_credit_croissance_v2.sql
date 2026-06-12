-- ============================================================
-- Migration 0025 — Crédit de Croissance v2
-- Refonte complète : expiration, journal, demandes de remboursement
-- ============================================================

-- ── 1. Évolution table credit_croissance ─────────────────────
-- Ajout : available_at (date de libération = 1er du mois suivant)
--         expires_at   (3 mois après available_at → expiration auto)
--         used_amount  (montant déjà utilisé sur cette entrée)
-- Le status passe de ('held','used') à 4 états :
--   held      → créé, pas encore libéré (avant le 1er du mois suivant)
--   available → libéré, utilisable
--   expired   → non utilisé dans les 3 mois → débité automatiquement
--   used      → entièrement consommé par remboursement(s)

CREATE TABLE IF NOT EXISTS credit_croissance_new (
  id                   TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  member_id            TEXT NOT NULL REFERENCES members(id),
  amount               REAL NOT NULL,
  used_amount          REAL NOT NULL DEFAULT 0,
  period               TEXT NOT NULL,          -- ex: '2026-05' (mois de qualification)
  source_commission_id TEXT REFERENCES commissions(id),
  available_at         TEXT NOT NULL,          -- datetime — 1er du mois M+1
  expires_at           TEXT NOT NULL,          -- datetime — 3 mois après available_at
  status               TEXT NOT NULL DEFAULT 'held'
                       CHECK(status IN ('held','available','expired','used')),
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at           TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO credit_croissance_new
  (id, member_id, amount, used_amount, period, source_commission_id,
   available_at, expires_at, status, created_at, updated_at)
  SELECT
    id, member_id, amount, 0, period, source_commission_id,
    -- available_at = 1er du mois suivant la période
    (substr(period, 1, 4) || '-' ||
      CASE WHEN CAST(substr(period, 6, 2) AS INTEGER) = 12 THEN '01'
           ELSE printf('%02d', CAST(substr(period, 6, 2) AS INTEGER) + 1) END
      || '-01 00:00:00'),
    -- expires_at = 3 mois après available_at (approximation +92j)
    (date(
      substr(period, 1, 4) || '-' ||
      CASE WHEN CAST(substr(period, 6, 2) AS INTEGER) = 12 THEN '01'
           ELSE printf('%02d', CAST(substr(period, 6, 2) AS INTEGER) + 1) END
      || '-01', '+3 months'
    ) || ' 00:00:00'),
    status,
    created_at,
    created_at
  FROM credit_croissance;

DROP TABLE credit_croissance;
ALTER TABLE credit_croissance_new RENAME TO credit_croissance;

CREATE INDEX IF NOT EXISTS idx_cc_member     ON credit_croissance(member_id);
CREATE INDEX IF NOT EXISTS idx_cc_status     ON credit_croissance(status);
CREATE INDEX IF NOT EXISTS idx_cc_expires    ON credit_croissance(expires_at);
CREATE INDEX IF NOT EXISTS idx_cc_available  ON credit_croissance(available_at);

-- ── 2. Journal de transactions CC ────────────────────────────
-- Toutes les opérations crédit/débit du wallet CC sont tracées ici.
-- type : 'credit'    → entrée (prime générée)
--        'debit'     → sortie (remboursement approuvé ou expiration)

CREATE TABLE IF NOT EXISTS cc_transactions (
  id                TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  member_id         TEXT NOT NULL REFERENCES members(id),
  type              TEXT NOT NULL CHECK(type IN ('credit','debit')),
  amount            REAL NOT NULL,                    -- toujours positif
  balance_after     REAL NOT NULL DEFAULT 0,          -- solde CC après opération
  label             TEXT NOT NULL,                    -- libellé premium
  reference_id      TEXT,                             -- id source (cc entry, withdrawal…)
  reference_type    TEXT,                             -- 'credit_croissance','cc_withdrawal','expiration'
  period            TEXT,                             -- période concernée ex: '2026-05'
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_cct_member  ON cc_transactions(member_id);
CREATE INDEX IF NOT EXISTS idx_cct_created ON cc_transactions(created_at);

-- ── 3. Demandes de remboursement CC ──────────────────────────
-- Le membre soumet une demande → admin approuve ou rejette.

CREATE TABLE IF NOT EXISTS cc_withdrawals (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  member_id       TEXT NOT NULL REFERENCES members(id),
  amount          REAL NOT NULL,
  description     TEXT NOT NULL,    -- nature de la dépense déclarée par le membre
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK(status IN ('pending','approved','rejected')),
  admin_note      TEXT,             -- commentaire admin lors du traitement
  reviewed_by     TEXT REFERENCES admin_users(id),
  reviewed_at     TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ccw_member  ON cc_withdrawals(member_id);
CREATE INDEX IF NOT EXISTS idx_ccw_status  ON cc_withdrawals(status);
CREATE INDEX IF NOT EXISTS idx_ccw_created ON cc_withdrawals(created_at);

-- ── 4. Activer le CC dans compensation_config ─────────────────
-- (déjà présent normalement, INSERT OR IGNORE pour sécurité)
INSERT OR IGNORE INTO compensation_config (id, key, value, description)
VALUES
  ('cc-exp-1', 'credit_croissance_validity_months', '3',
   'Durée de validité du Crédit de Croissance en mois'),
  ('cc-exp-2', 'credit_croissance_max_withdrawal',  '0',
   'Montant max par demande (0 = illimité)');
