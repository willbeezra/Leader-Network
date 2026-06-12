-- Migration 0055 — Plafond du Crédit de Croissance
-- Le wallet CC d'un membre ne peut jamais dépasser 5000$.
-- Valeur stockée en compensation_config pour être modifiable depuis l'admin.

INSERT INTO compensation_config (id, key, value, description)
VALUES (
  'cfg-cc-cap-001',
  'credit_croissance_cap',
  '5000',
  'Plafond maximum du wallet Crédit de Croissance par membre (en USD). Un membre ne peut jamais avoir plus de ce montant en CC cumulé.'
)
ON CONFLICT(key) DO UPDATE SET
  value       = excluded.value,
  description = excluded.description,
  updated_at  = datetime('now');
