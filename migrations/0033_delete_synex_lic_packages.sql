-- ============================================================
-- Migration 0033 — Suppression définitive des packages + Licence SYNEX
-- Ces packages ne doivent JAMAIS être recréés.
-- IDs supprimés : pkg-production-lic, pkg-developpement-lic,
--                 pkg-pinacle-lic, pkg-influence-lic
-- ============================================================

-- Suppression définitive — aucune commande associée à ces IDs
DELETE FROM packages
WHERE id IN (
  'pkg-production-lic',
  'pkg-developpement-lic',
  'pkg-pinacle-lic',
  'pkg-influence-lic'
);

-- Vérification : seuls les 4 packages SYNEX officiels doivent rester actifs
-- pkg-production   → PRODUCTION     $600  / 240 BV
-- pkg-developpement → DÉVELOPPEMENT $1000 / 400 BV
-- pkg-pinacle      → PINACLE        $1500 / 600 BV
-- pkg-influence    → INFLUENCE      $2000 / 800 BV
