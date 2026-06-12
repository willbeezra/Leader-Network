-- ══════════════════════════════════════════════════════════════════
-- MIGRATION 0027 — Système de catégories premium pour Marketing
-- + Stockage fichiers uploadés (uploaded_files table)
-- ══════════════════════════════════════════════════════════════════

-- Table des catégories marketing premium
CREATE TABLE IF NOT EXISTS marketing_categories (
  id        TEXT PRIMARY KEY,
  name      TEXT NOT NULL,
  icon      TEXT NOT NULL DEFAULT 'fa-folder',
  color     TEXT NOT NULL DEFAULT 'gold',
  gradient  TEXT DEFAULT 'from-yellow-600 to-yellow-800',
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active  INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Colonne category_id sur marketing_assets (lien vers marketing_categories)
ALTER TABLE marketing_assets ADD COLUMN category_id TEXT REFERENCES marketing_categories(id);

-- Table pour stocker les fichiers uploadés (fallback si pas de R2)
CREATE TABLE IF NOT EXISTS uploaded_files (
  id         TEXT PRIMARY KEY,
  member_id  TEXT,
  admin_id   TEXT,
  filename   TEXT NOT NULL,
  mime_type  TEXT NOT NULL DEFAULT 'application/octet-stream',
  size_bytes INTEGER NOT NULL DEFAULT 0,
  purpose    TEXT NOT NULL DEFAULT 'marketing', -- 'marketing', 'kyc', 'proof', 'other'
  storage    TEXT NOT NULL DEFAULT 'db',         -- 'db' ou 'r2'
  r2_key     TEXT,
  data_b64   TEXT,                               -- base64 si storage='db'
  url        TEXT,                               -- URL publique finale
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── Catégories premium par défaut ─────────────────────────────────
INSERT OR IGNORE INTO marketing_categories (id, name, icon, color, gradient, description, sort_order) VALUES
  ('cat-docs',   'Documents Officiels', 'fa-file-contract', 'gold',   'from-yellow-600 to-amber-700',    'Plans de compensation, conditions générales, formulaires officiels', 0),
  ('cat-promo',  'Outils Promotionnels','fa-bullhorn',       'blue',   'from-blue-600 to-indigo-700',     'Bannières, flyers, templates pour vos campagnes de recrutement', 1),
  ('cat-slides', 'Présentations',       'fa-presentation-screen','purple','from-purple-600 to-violet-700','Slides de présentation de l''opportunité LEADER Network', 2),
  ('cat-brand',  'Charte Graphique',    'fa-palette',        'pink',   'from-pink-600 to-rose-700',       'Logos, couleurs officielles, guide de marque LEADER Network', 3),
  ('cat-video',  'Vidéos & Médias',     'fa-video',          'red',    'from-red-600 to-orange-700',      'Vidéos de présentation, témoignages, contenus multimédias', 4),
  ('cat-training','Formation',          'fa-graduation-cap', 'green',  'from-green-600 to-emerald-700',   'Modules de formation, guides pratiques, tutoriels', 5);

-- ── Mise à jour du PDF existant avec sa catégorie ─────────────────
UPDATE marketing_assets
SET    category_id = 'cat-docs'
WHERE  id = 'plan-compensation-2025';
