-- Migration 0069 : Nettoyage des packages broker mal placés dans cat-synex
-- Suppression (soft-delete) des packages pkg-synex-leader et pkg-synex-triomarkets
-- qui avaient été créés dans la mauvaise catégorie (cat-synex au lieu de cat-synex-triomarkets)

UPDATE packages
SET deleted_at = datetime('now'), is_active = 0
WHERE id IN ('pkg-synex-leader', 'pkg-synex-triomarkets');
