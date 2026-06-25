-- Migration 0086 : Ajout cb_retry_count dans subscription_renewals
-- + Colonne stripe_setup_intent_id dans member_saved_payments

-- Compteur de tentatives CB (pour la logique J+1/J+3/J+5)
ALTER TABLE subscription_renewals ADD COLUMN cb_retry_count INTEGER NOT NULL DEFAULT 0;

-- ID du Setup Intent Stripe utilisé pour enregistrer la carte
ALTER TABLE member_saved_payments ADD COLUMN stripe_setup_intent_id TEXT DEFAULT NULL;

-- Flag pour éviter de renvoyer un email de rappel abonnement
ALTER TABLE member_saved_payments ADD COLUMN reminder_sent_at DATETIME DEFAULT NULL;
