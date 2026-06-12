-- Migration 0051: Méthodes de paiement membres
-- Ajoute les colonnes de coordonnées bancaires/PayPal/Crypto sur la table members
-- Permet de sauvegarder une fois les coordonnées et pré-remplir automatiquement au retrait

-- Méthode de paiement préférée
ALTER TABLE members ADD COLUMN payout_method TEXT DEFAULT NULL;

-- ── PayPal ────────────────────────────────────────────────────────
ALTER TABLE members ADD COLUMN payout_paypal_email TEXT DEFAULT NULL;

-- ── Virement bancaire (SEPA + international) ──────────────────────
ALTER TABLE members ADD COLUMN payout_bank_holder TEXT DEFAULT NULL;       -- Titulaire du compte
ALTER TABLE members ADD COLUMN payout_bank_iban TEXT DEFAULT NULL;         -- IBAN (ex: FR76...)
ALTER TABLE members ADD COLUMN payout_bank_bic TEXT DEFAULT NULL;          -- BIC/SWIFT (ex: BNPAFRPP)
ALTER TABLE members ADD COLUMN payout_bank_name TEXT DEFAULT NULL;         -- Nom de la banque
ALTER TABLE members ADD COLUMN payout_bank_account TEXT DEFAULT NULL;      -- Numéro de compte local
ALTER TABLE members ADD COLUMN payout_bank_address TEXT DEFAULT NULL;      -- Adresse de la banque
ALTER TABLE members ADD COLUMN payout_bank_city TEXT DEFAULT NULL;         -- Ville de la banque
ALTER TABLE members ADD COLUMN payout_bank_country TEXT DEFAULT NULL;      -- Pays de la banque (code ISO: FR, US...)
ALTER TABLE members ADD COLUMN payout_bank_swift TEXT DEFAULT NULL;        -- SWIFT supplémentaire si différent du BIC

-- ── Cryptomonnaie ─────────────────────────────────────────────────
ALTER TABLE members ADD COLUMN payout_crypto_currency TEXT DEFAULT NULL;   -- Ex: USDT, BTC, ETH
ALTER TABLE members ADD COLUMN payout_crypto_network TEXT DEFAULT NULL;    -- Ex: TRC20, ERC20, BEP20, BTC
ALTER TABLE members ADD COLUMN payout_crypto_address TEXT DEFAULT NULL;    -- Adresse du wallet

-- Colonnes supplémentaires pour la table withdrawals:
-- Stocker les coordonnées utilisées au moment du retrait (snapshot)
ALTER TABLE withdrawals ADD COLUMN payout_method TEXT DEFAULT NULL;
ALTER TABLE withdrawals ADD COLUMN payout_details TEXT DEFAULT NULL;  -- JSON snapshot des coordonnées

-- Index pour les recherches admin
CREATE INDEX IF NOT EXISTS idx_members_payout_method ON members(payout_method);
CREATE INDEX IF NOT EXISTS idx_withdrawals_payout_method ON withdrawals(payout_method);
