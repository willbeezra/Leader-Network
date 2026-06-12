-- Migration 0046: Ajouter rejection_reason à finstrategia_licenses
-- Nécessaire pour la route POST /api/admin/activations/reject-license/:id

ALTER TABLE finstrategia_licenses ADD COLUMN rejection_reason TEXT;
