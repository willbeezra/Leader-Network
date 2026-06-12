-- Migration 0045 : Ajouter admin_fee_amount à finstrategia_licenses
-- Cette colonne est requise par le backend pour enregistrer les frais admin
-- lors de l'achat de licence (wallet, manuel, crypto, bank, PSP)
-- Cause racine de l'erreur "Erreur lors de la création de la commande"
-- pour tous les modes de paiement sauf PayPal (qui bypasse l'INSERT).

ALTER TABLE finstrategia_licenses ADD COLUMN admin_fee_amount REAL NOT NULL DEFAULT 0;

-- Index utile pour les rapports admin
CREATE INDEX IF NOT EXISTS idx_lic_payment_method ON finstrategia_licenses(payment_method);
