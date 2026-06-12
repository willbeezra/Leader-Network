-- ═══════════════════════════════════════════════════════════════════════
-- Migration 0040 — Branding & Identité visuelle
-- Stocke tous les paramètres d'identité de la plateforme :
-- logo (base64 ou URL), nom réseau, couleurs PDF, pied de page, etc.
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS branding_config (
    key        TEXT PRIMARY KEY,
    value      TEXT,
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Valeurs par défaut (vides — l'admin les renseigne via l'interface)
INSERT OR IGNORE INTO branding_config (key, value) VALUES
  -- Identité
  ('network_name',      'Mon Réseau'),
  ('tagline',           ''),
  -- Logo : base64 data URI (PNG/SVG/JPG) uploadé via l'interface
  ('logo_data_uri',     ''),
  -- Couleurs PDF (format hex)
  ('pdf_color_primary', '#D4AF37'),
  ('pdf_color_dark',    '#0A0A16'),
  ('pdf_color_accent',  '#34D399'),
  -- Textes PDF
  ('pdf_footer_text',   'Document confidentiel — Usage administratif interne'),
  ('pdf_report_title',  'Rapport Analytique'),
  -- Coordonnées (optionnel, affiché dans pied de page)
  ('company_address',   ''),
  ('company_email',     ''),
  ('company_website',   '');
