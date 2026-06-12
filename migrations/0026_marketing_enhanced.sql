-- Migration 0026 : Enrichissement de la table marketing_assets
-- Ajout : description, is_downloadable, sort_order, file_size, tag_color, views_count

ALTER TABLE marketing_assets ADD COLUMN description TEXT;
ALTER TABLE marketing_assets ADD COLUMN is_downloadable INTEGER NOT NULL DEFAULT 1;
ALTER TABLE marketing_assets ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;
ALTER TABLE marketing_assets ADD COLUMN file_size TEXT;
ALTER TABLE marketing_assets ADD COLUMN tag_color TEXT DEFAULT 'gold';
ALTER TABLE marketing_assets ADD COLUMN views_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE marketing_assets ADD COLUMN featured INTEGER NOT NULL DEFAULT 0;

-- Insérer le PDF Plan de Compensation LEADER Network
INSERT INTO marketing_assets (
  id, title, type, url, thumbnail_url, category, description,
  is_active, is_downloadable, sort_order, file_size, tag_color, featured
) VALUES (
  'plan-compensation-2025',
  'Plan de Compensation Officiel 2025',
  'pdf',
  'https://www.genspark.ai/api/files/s/DmBHdOF6',
  NULL,
  'Documentation',
  'Document officiel et complet expliquant en détail le fonctionnement du plan de compensation LEADER Network : les 11 rangs, les 7 sources de revenus (Fast Start, Prime Leadership, Rayonnement, Influence, CC, RS), les packages et BV, avec exemples chiffrés par rang.',
  1,
  1,
  0,
  '1.03 MB',
  'gold',
  1
);
