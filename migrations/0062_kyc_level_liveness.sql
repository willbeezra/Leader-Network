-- Migration 0062 : Ajout liveness_required sur kyc_levels
ALTER TABLE kyc_levels ADD COLUMN liveness_required INTEGER DEFAULT 0;
