-- ============================================================
-- Migration 0060 — Fix KYC level synchronisation
-- Corrige les comptes où kyc_status='verified' mais kyc_level=0
-- (causé par l'ancienne route d'approbation qui n'updatait pas kyc_level)
-- ============================================================

-- Corriger tous les membres vérifiés dont le kyc_level est encore à 0
UPDATE members
SET kyc_level = 1,
    updated_at = datetime('now')
WHERE kyc_status = 'verified'
  AND (kyc_level IS NULL OR kyc_level = 0);
