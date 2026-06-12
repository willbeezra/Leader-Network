-- Migration 0016 : Journal d'audit admin + impersonation tokens
-- Toutes les opérations manuelles des admins sont tracées ici

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id            TEXT PRIMARY KEY,
  admin_id      TEXT NOT NULL,
  admin_email   TEXT NOT NULL,
  member_id     TEXT,
  member_unique_id TEXT,
  action        TEXT NOT NULL,          -- 'wallet_credit', 'wallet_debit', 'wallet_release', 'wallet_force', 'impersonate', etc.
  wallet_type   TEXT,                   -- 'principal', 'pending', 'cc', 'rs', 'luxia'
  amount        REAL,
  description   TEXT NOT NULL,
  metadata      TEXT,                   -- JSON pour données supplémentaires
  created_at    DATETIME DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_audit_admin    ON admin_audit_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_member   ON admin_audit_log(member_id);
CREATE INDEX IF NOT EXISTS idx_audit_created  ON admin_audit_log(created_at DESC);
