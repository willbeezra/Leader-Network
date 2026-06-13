-- ============================================================
-- Migration 0077 — Table i18n_languages
-- Langues configurables depuis le panel admin
-- ============================================================

CREATE TABLE IF NOT EXISTS i18n_languages (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  code        TEXT NOT NULL UNIQUE,          -- code ISO ou custom (ex: 'fr', 'rcf', 'rcm')
  name        TEXT NOT NULL,                  -- nom affiché (ex: 'Créole Réunionnais')
  flag        TEXT NOT NULL DEFAULT '🌐',    -- emoji drapeau
  is_active   INTEGER NOT NULL DEFAULT 1,    -- 1=actif, 0=désactivé
  sort_order  INTEGER NOT NULL DEFAULT 100,  -- ordre dans le sélecteur
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Langues par défaut (toutes les grandes langues + créoles)
INSERT OR IGNORE INTO i18n_languages (code, name, flag, is_active, sort_order) VALUES
  ('fr',  'Français',              '🇫🇷', 1, 1),
  ('en',  'English',               '🇬🇧', 1, 2),
  ('es',  'Español',               '🇪🇸', 1, 3),
  ('pt',  'Português',             '🇧🇷', 1, 4),
  ('hi',  'हिंदी',                  '🇮🇳', 1, 5),
  ('de',  'Deutsch',               '🇩🇪', 1, 6),
  ('ar',  'العربية',               '🇸🇦', 1, 7),
  ('zh',  '中文',                   '🇨🇳', 1, 8),
  ('it',  'Italiano',              '🇮🇹', 1, 9),
  ('ru',  'Русский',               '🇷🇺', 1, 10),
  ('tr',  'Türkçe',                '🇹🇷', 1, 11),
  ('nl',  'Nederlands',            '🇳🇱', 1, 12),
  ('ko',  '한국어',                  '🇰🇷', 1, 13),
  ('ja',  '日本語',                  '🇯🇵', 1, 14),
  ('vi',  'Tiếng Việt',            '🇻🇳', 1, 15),
  ('id',  'Bahasa Indonesia',      '🇮🇩', 1, 16),
  ('pl',  'Polski',                '🇵🇱', 1, 17),
  ('uk',  'Українська',            '🇺🇦', 1, 18),
  ('ro',  'Română',                '🇷🇴', 1, 19),
  ('th',  'ภาษาไทย',               '🇹🇭', 1, 20),
  ('sw',  'Kiswahili',             '🇰🇪', 1, 21),
  ('ms',  'Bahasa Melayu',         '🇲🇾', 1, 22),
  ('tl',  'Filipino',              '🇵🇭', 1, 23),
  ('bn',  'বাংলা',                  '🇧🇩', 1, 24),
  ('ur',  'اردو',                  '🇵🇰', 1, 25),
  -- Créoles (codes ISO 639-3 ou codes custom)
  ('rcf', 'Créole Réunionnais',    '🇷🇪', 1, 50),
  ('mfe', 'Créole Mauricien',      '🇲🇺', 1, 51),
  ('hat', 'Créole Haïtien',        '🇭🇹', 1, 52),
  ('gcf', 'Créole Guadeloupéen',   '🇬🇵', 1, 53),
  ('mart','Créole Martiniquais',   '🇲🇶', 1, 54),
  ('mad', 'Malgache',              '🇲🇬', 1, 55);

CREATE INDEX IF NOT EXISTS idx_i18n_languages_active ON i18n_languages(is_active, sort_order);
