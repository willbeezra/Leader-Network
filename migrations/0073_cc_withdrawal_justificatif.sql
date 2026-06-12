-- Migration 0073 : ajout colonne justificatif à cc_withdrawals
-- Permet de stocker le fichier justificatif (base64 data URL) soumis avec la demande CC

ALTER TABLE cc_withdrawals ADD COLUMN justificatif_url TEXT;
ALTER TABLE cc_withdrawals ADD COLUMN justificatif_name TEXT;
ALTER TABLE cc_withdrawals ADD COLUMN justificatif_type TEXT;
