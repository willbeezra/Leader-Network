-- Migration 0087 : table des ajustements manuels BV et rang (member_overrides)
-- Les overrides s'ajoutent PAR-DESSUS les vraies valeurs sans les modifier.
-- Les vraies données membres (left_bv_total, etc.) restent intactes.

CREATE TABLE IF NOT EXISTS member_overrides (
  id           TEXT PRIMARY KEY,
  member_id    TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,

  -- BV bonus (s'additionnent aux vrais BV du membre)
  bv_left_monthly_bonus  REAL NOT NULL DEFAULT 0,  -- ajout au BV mensuel gauche
  bv_right_monthly_bonus REAL NOT NULL DEFAULT 0,  -- ajout au BV mensuel droit
  bv_left_total_bonus    REAL NOT NULL DEFAULT 0,  -- ajout au BV total gauche
  bv_right_total_bonus   REAL NOT NULL DEFAULT 0,  -- ajout au BV total droit

  -- Rang override (NULL = pas d'override, rang calculé automatiquement)
  rank_override TEXT DEFAULT NULL,

  -- Métadonnées
  reason       TEXT,              -- raison de l'ajustement (saisie admin)
  created_by   TEXT,              -- admin_user.id qui a créé/modifié
  created_at   DATETIME NOT NULL DEFAULT (datetime('now')),
  updated_at   DATETIME NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_member_overrides_member
  ON member_overrides(member_id);

-- Log immuable de chaque modification (audit trail)
CREATE TABLE IF NOT EXISTS member_overrides_log (
  id           TEXT PRIMARY KEY,
  member_id    TEXT NOT NULL,
  admin_id     TEXT,              -- admin qui a effectué l'action
  action       TEXT NOT NULL,     -- 'set' | 'reset'
  -- snapshot des valeurs appliquées
  bv_left_monthly_bonus  REAL DEFAULT 0,
  bv_right_monthly_bonus REAL DEFAULT 0,
  bv_left_total_bonus    REAL DEFAULT 0,
  bv_right_total_bonus   REAL DEFAULT 0,
  rank_override          TEXT DEFAULT NULL,
  reason       TEXT,
  created_at   DATETIME NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_overrides_log_member
  ON member_overrides_log(member_id);
