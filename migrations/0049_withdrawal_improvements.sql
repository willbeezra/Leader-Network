-- ── Migration 0049 — Améliorations système de retrait ──────────────────────
-- 1. Champ dédié pour la référence de transaction (PayPal Ref, TXID, etc.)
-- 2. Méthode de paiement explicite (paypal, bank, crypto...)
-- 3. Note interne admin (séparée du motif de rejet)
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE withdrawals ADD COLUMN payment_reference TEXT DEFAULT NULL;
ALTER TABLE withdrawals ADD COLUMN payment_method TEXT NOT NULL DEFAULT 'paypal';
ALTER TABLE withdrawals ADD COLUMN admin_internal_note TEXT DEFAULT NULL;

-- Index pour retrouver rapidement par méthode
CREATE INDEX IF NOT EXISTS idx_withdrawals_payment_method ON withdrawals(payment_method);
CREATE INDEX IF NOT EXISTS idx_withdrawals_payment_reference ON withdrawals(payment_reference);
