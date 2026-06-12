-- Migration 0076 : Ajout colonnes champs custom dans cc_withdrawals
-- Stocke les valeurs des 3 champs libres configurés par l'admin

ALTER TABLE cc_withdrawals ADD COLUMN custom1 TEXT;
ALTER TABLE cc_withdrawals ADD COLUMN custom2 TEXT;
ALTER TABLE cc_withdrawals ADD COLUMN custom3 TEXT;
