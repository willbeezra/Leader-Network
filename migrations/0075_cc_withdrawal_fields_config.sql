-- Migration 0075 : Configuration des champs du formulaire CC Withdrawal
-- Permet à l'admin de contrôler chaque champ : visible, obligatoire, label personnalisé
--
-- Structure des clés :
--   cc_field_<nom>_visible    → '1' = affiché, '0' = masqué
--   cc_field_<nom>_required   → '1' = obligatoire, '0' = optionnel
--   cc_field_<nom>_label      → texte affiché au membre (modifiable)
--
-- Champs gérés :
--   description   → motif / explication de la demande
--   justificatif  → pièce jointe (PDF, image)
--   custom1       → champ libre 1 (texte)
--   custom2       → champ libre 2 (texte)
--   custom3       → champ libre 3 (texte)

-- ── Champ : Description / Motif ───────────────────────────────────────────────
INSERT OR IGNORE INTO compensation_config (id, key, value, description) VALUES
  ('ccf-desc-vis',  'cc_field_description_visible',  '1', 'Champ Description : affiché (1) ou masqué (0)'),
  ('ccf-desc-req',  'cc_field_description_required', '1', 'Champ Description : obligatoire (1) ou optionnel (0)'),
  ('ccf-desc-lbl',  'cc_field_description_label',    'Motif de la demande', 'Champ Description : label affiché au membre');

-- ── Champ : Justificatif (pièce jointe) ──────────────────────────────────────
INSERT OR IGNORE INTO compensation_config (id, key, value, description) VALUES
  ('ccf-just-vis',  'cc_field_justificatif_visible',  '1', 'Champ Justificatif : affiché (1) ou masqué (0)'),
  ('ccf-just-req',  'cc_field_justificatif_required', '0', 'Champ Justificatif : obligatoire (1) ou optionnel (0)'),
  ('ccf-just-lbl',  'cc_field_justificatif_label',    'Justificatif (PDF, JPG, PNG)', 'Champ Justificatif : label affiché au membre');

-- ── Champ custom 1 (libre) ────────────────────────────────────────────────────
INSERT OR IGNORE INTO compensation_config (id, key, value, description) VALUES
  ('ccf-c1-vis',  'cc_field_custom1_visible',  '0', 'Champ custom 1 : affiché (1) ou masqué (0)'),
  ('ccf-c1-req',  'cc_field_custom1_required', '0', 'Champ custom 1 : obligatoire (1) ou optionnel (0)'),
  ('ccf-c1-lbl',  'cc_field_custom1_label',    'Information complémentaire 1', 'Champ custom 1 : label affiché au membre');

-- ── Champ custom 2 (libre) ────────────────────────────────────────────────────
INSERT OR IGNORE INTO compensation_config (id, key, value, description) VALUES
  ('ccf-c2-vis',  'cc_field_custom2_visible',  '0', 'Champ custom 2 : affiché (1) ou masqué (0)'),
  ('ccf-c2-req',  'cc_field_custom2_required', '0', 'Champ custom 2 : obligatoire (1) ou optionnel (0)'),
  ('ccf-c2-lbl',  'cc_field_custom2_label',    'Information complémentaire 2', 'Champ custom 2 : label affiché au membre');

-- ── Champ custom 3 (libre) ────────────────────────────────────────────────────
INSERT OR IGNORE INTO compensation_config (id, key, value, description) VALUES
  ('ccf-c3-vis',  'cc_field_custom3_visible',  '0', 'Champ custom 3 : affiché (1) ou masqué (0)'),
  ('ccf-c3-req',  'cc_field_custom3_required', '0', 'Champ custom 3 : obligatoire (1) ou optionnel (0)'),
  ('ccf-c3-lbl',  'cc_field_custom3_label',    'Information complémentaire 3', 'Champ custom 3 : label affiché au membre');
