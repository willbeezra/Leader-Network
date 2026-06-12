-- Migration 0074 : paramètres configurables pour les demandes CC (cc_withdrawals)
-- Ajoute les clés manquantes dans compensation_config

INSERT OR IGNORE INTO compensation_config (id, key, value, description)
VALUES
  ('cc-wd-1', 'cc_withdrawal_min_amount',    '10',    'Montant minimum par demande CC ($)'),
  ('cc-wd-2', 'cc_withdrawal_max_amount',    '5000',  'Montant maximum par demande CC ($)'),
  ('cc-wd-3', 'cc_withdrawal_desc_min_chars','10',    'Nombre minimum de caractères pour la description CC'),
  ('cc-wd-4', 'cc_withdrawal_processing_time','48h',  'Délai de traitement affiché pour les demandes CC'),
  ('cc-wd-5', 'cc_withdrawal_max_pending',   '1',     'Nombre maximum de demandes CC en attente simultanément (0 = illimité)');
