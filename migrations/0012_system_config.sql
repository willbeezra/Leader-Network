-- ═══════════════════════════════════════════════════════════
-- Migration 0012 — Table system_config (clé/valeur système)
-- Utilisée pour tracker le dernier daily payment auto-trigger
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS system_config (
    key        TEXT PRIMARY KEY,
    value      TEXT,
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Initialiser le dernier daily payment à hier pour forcer le 1er déclenchement
INSERT OR IGNORE INTO system_config (key, value)
VALUES ('last_daily_payment', date('now', '-1 day'));
