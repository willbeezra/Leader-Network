-- ============================================================
-- Migration 0083 — Commandes formations Campus
-- Achat direct d'une formation (sans passer par les packages)
-- Pas de BV, pas de guard catégorie, vente simple
-- ============================================================

CREATE TABLE IF NOT EXISTS campus_course_orders (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  member_id   TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  course_id   TEXT NOT NULL REFERENCES campus_courses(id) ON DELETE CASCADE,
  amount_usd  REAL NOT NULL DEFAULT 0,
  status      TEXT NOT NULL DEFAULT 'pending'
              CHECK(status IN ('pending','proof_submitted','validated','rejected','cancelled')),
  payment_method TEXT NOT NULL DEFAULT 'manual',
  proof_url   TEXT,
  note        TEXT,
  rejection_reason TEXT,
  created_at  DATETIME DEFAULT (datetime('now')),
  updated_at  DATETIME DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_cco_member  ON campus_course_orders(member_id);
CREATE INDEX IF NOT EXISTS idx_cco_course  ON campus_course_orders(course_id);
CREATE INDEX IF NOT EXISTS idx_cco_status  ON campus_course_orders(status);
