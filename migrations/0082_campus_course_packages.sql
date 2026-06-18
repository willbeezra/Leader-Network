-- ============================================================
-- Migration 0082 — Système d'accès formations par package
-- Permet de définir quels packages donnent accès à quelle formation
-- + configs badges entièrement configurables depuis l'admin
-- ============================================================

-- Table de liaison : formation ↔ packages autorisés
-- Un cours peut être accessible par plusieurs packages
CREATE TABLE IF NOT EXISTS campus_course_packages (
  id        TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  course_id TEXT NOT NULL REFERENCES campus_courses(id) ON DELETE CASCADE,
  package_id TEXT NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  created_at DATETIME DEFAULT (datetime('now')),
  UNIQUE(course_id, package_id)
);

CREATE INDEX IF NOT EXISTS idx_ccp_course  ON campus_course_packages(course_id);
CREATE INDEX IF NOT EXISTS idx_ccp_package ON campus_course_packages(package_id);

-- ============================================================
-- Configs badges Campus — 100% configurables depuis l'admin
-- Préfixe : campus_badge_*
-- ============================================================

-- Badge "Inclus" (membre a accès via son package)
INSERT OR IGNORE INTO landing_config (key, value) VALUES
  ('campus_badge_included_text',  'Inclus'),
  ('campus_badge_included_color', '#22c55e'),
  ('campus_badge_included_icon',  'fa-check-circle');

-- Badge "Verrouillé" (aucun package ne donne accès, pas de prix)
INSERT OR IGNORE INTO landing_config (key, value) VALUES
  ('campus_badge_locked_text',    'Verrouillé'),
  ('campus_badge_locked_color',   '#6b7280'),
  ('campus_badge_locked_icon',    'fa-lock');

-- Badge "Gratuit" (is_free = 1)
INSERT OR IGNORE INTO landing_config (key, value) VALUES
  ('campus_badge_free_text',      'Gratuit'),
  ('campus_badge_free_color',     '#c9a84c'),
  ('campus_badge_free_icon',      'fa-star');

-- Texte du bouton sur la carte verrouillée
INSERT OR IGNORE INTO landing_config (key, value) VALUES
  ('campus_badge_locked_btn',     'Voir les packages');

-- Texte du bouton CTA sur la modal de paiement cours
INSERT OR IGNORE INTO landing_config (key, value) VALUES
  ('campus_course_buy_cta',       'Acquérir cette formation');
