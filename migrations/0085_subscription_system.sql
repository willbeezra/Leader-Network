-- ============================================================
-- Migration 0085 — Système d'abonnements mensuels
-- Packages avec adhésion initiale + renouvellement mensuel
-- Priorité prélèvement : wallet → CB (Stripe/Mollie) → Triomarkets manuel
-- Tout est paramétrable en DB via subscription_config
-- ============================================================

-- ── 1. Catégorie pour les packages abonnement ────────────────────────────────
INSERT OR IGNORE INTO package_categories (id, name, icon, description, tag)
VALUES (
  'cat-subscription',
  'ABONNEMENTS',
  'fa-crown',
  'Packages avec adhésion mensuelle donnant accès à des services',
  'subscription'
);

-- ── 2. Colonne sur packages — montant adhésion initiale séparé du mensuel ───
-- price_usd    = frais d'adhésion une seule fois (ex: 199$ ou 299$)
-- price_monthly = abonnement mensuel récurrent (ex: 49$ ou 99$)
-- Ces colonnes EXISTENT déjà — on les réutilise sans ALTER

-- ── 3. Table principale des renouvellements ──────────────────────────────────
CREATE TABLE IF NOT EXISTS subscription_renewals (
  id                  TEXT PRIMARY KEY,  -- sren-{memberId[:8]}-{YYYYMM}
  member_id           TEXT NOT NULL REFERENCES members(id),
  package_order_id    TEXT NOT NULL REFERENCES package_orders(id),
  package_id          TEXT NOT NULL,
  period              TEXT NOT NULL,     -- 'YYYY-MM' ex: '2026-07'
  amount_due          REAL NOT NULL,     -- montant mensuel prélevé
  status              TEXT NOT NULL DEFAULT 'pending'
    CHECK(status IN (
      'pending',          -- en attente de traitement
      'paid_wallet',      -- prélevé sur wallet principal ✅
      'paid_cb',          -- prélevé sur CB (Stripe/Mollie) ✅
      'trio_pending',     -- dans la liste Trio, en attente validation admin
      'trio_confirmed',   -- confirmé manuellement par admin ✅
      'failed',           -- échec total après J+7
      'suspended'         -- abonnement suspendu
    )),
  payment_method      TEXT DEFAULT NULL, -- 'wallet'|'stripe'|'mollie'|'trio_manual'

  -- Suivi tentative 1 — Wallet
  wallet_tried_at     DATETIME DEFAULT NULL,
  wallet_result       TEXT DEFAULT NULL,  -- 'ok'|'insufficient'|'error'

  -- Suivi tentative 2 — CB automatique
  cb_tried_at         DATETIME DEFAULT NULL,
  cb_result           TEXT DEFAULT NULL,  -- 'ok'|'declined'|'no_card'|'error'
  cb_charge_id        TEXT DEFAULT NULL,  -- ID charge Stripe/Mollie

  -- Suivi tentative 3 — Triomarkets manuel
  trio_listed_at      DATETIME DEFAULT NULL,
  trio_confirmed_at   DATETIME DEFAULT NULL,
  trio_confirmed_by   TEXT DEFAULT NULL,  -- admin_id qui a validé
  trio_amount_received REAL DEFAULT NULL, -- montant réellement reçu

  -- Délai de grâce
  grace_expires_at    DATETIME DEFAULT NULL, -- J+7 depuis création
  suspended_at        DATETIME DEFAULT NULL,

  -- Traçabilité
  notes               TEXT DEFAULT NULL,
  created_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(member_id, period, package_id) -- un seul renouvellement par membre/mois/package
);

-- ── 4. Table des moyens de paiement sauvegardés ─────────────────────────────
CREATE TABLE IF NOT EXISTS member_saved_payments (
  id                  TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  member_id           TEXT NOT NULL REFERENCES members(id),
  provider            TEXT NOT NULL CHECK(provider IN ('stripe','mollie')),
  -- Stripe
  stripe_customer_id  TEXT DEFAULT NULL,
  stripe_pm_id        TEXT DEFAULT NULL,  -- payment_method_id sauvegardé
  -- Mollie
  mollie_customer_id  TEXT DEFAULT NULL,
  mollie_mandate_id   TEXT DEFAULT NULL,
  -- Infos carte (non-sensibles, pour affichage)
  card_brand          TEXT DEFAULT NULL,  -- 'visa'|'mastercard'|...
  card_last4          TEXT DEFAULT NULL,
  card_exp_month      INTEGER DEFAULT NULL,
  card_exp_year       INTEGER DEFAULT NULL,
  -- Statut
  is_default          INTEGER NOT NULL DEFAULT 1 CHECK(is_default IN (0,1)),
  is_active           INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0,1)),
  created_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ── 5. Extension broker_registrations — type broker pour Synex Libre / Kronex
-- Ajout colonne broker_type pour distinguer les flows sans BV
ALTER TABLE broker_registrations ADD COLUMN broker_type TEXT NOT NULL DEFAULT 'standard'
  CHECK(broker_type IN ('standard','no_bv'));
-- standard = flow normal Triomarkets avec BV
-- no_bv    = Synex Libre / Kronex — lien simple, 0 BV

-- ── 6. Config système abonnements — TOUT paramétrable ───────────────────────
INSERT OR IGNORE INTO system_config (key, value) VALUES
  -- Activation du système
  ('subscription_enabled',            '1'),
  -- Délai de grâce en jours avant suspension
  ('subscription_grace_days',         '7'),
  -- Jour du mois pour le prélèvement (1 = 1er du mois)
  ('subscription_billing_day',        '1'),
  -- Ordre de priorité des méthodes de paiement (séparés par virgule)
  ('subscription_payment_priority',   'wallet,cb,trio'),
  -- Activer/désactiver chaque méthode individuellement
  ('subscription_method_wallet',      '1'),
  ('subscription_method_cb',          '1'),
  ('subscription_method_trio',        '1'),
  -- Notification avant expiration (jours)
  ('subscription_notify_before_days', '3'),
  -- Email admin pour la liste Trio mensuelle
  ('subscription_trio_admin_email',   ''),
  -- Synex Libre — lien d'affiliation
  ('broker_synex_libre_enabled',      '1'),
  ('broker_synex_libre_url',          ''),
  ('broker_synex_libre_name',         'Synex Libre'),
  ('broker_synex_libre_description',  'Dépôt libre sans BV — accédez aux marchés financiers'),
  -- Kronex — lien d'affiliation
  ('broker_kronex_enabled',           '1'),
  ('broker_kronex_url',               ''),
  ('broker_kronex_name',              'Kronex'),
  ('broker_kronex_description',       'Dépôt libre sans BV — accédez aux marchés financiers');

-- ── 7. Les 2 packages abonnement ────────────────────────────────────────────
INSERT OR IGNORE INTO package_categories (id, name, icon, description, tag)
VALUES (
  'cat-synex-libre',
  'SYNEX LIBRE',
  'fa-globe',
  'Abonnements avec accès broker libre (Synex Libre + Kronex)',
  'subscription_broker'
);

-- Package Essentiel — 199$ adhésion + 49$/mois
INSERT OR IGNORE INTO packages
  (id, name, slug, price_usd, price_monthly, bv_value, bv_per_payment,
   pricing_type, payment_mode, category_id, is_active, display_order,
   description, features, title, direct_commission_rate)
VALUES (
  'pkg-synex-libre-essentiel',
  'Synex Libre Essentiel',
  'synex-libre-essentiel',
  199,   -- adhésion initiale
  49,    -- mensuel
  0,     -- 0 BV (pas de MLM sur ces packages)
  0,
  'monthly',
  'subscription',
  'cat-synex-libre',
  1,
  50,
  'Package abonnement mensuel avec accès aux services et aux brokers Synex Libre & Kronex.',
  '["Accès aux services inclus","Lien Synex Libre (dépôt libre)","Lien Kronex (dépôt libre)","Support prioritaire"]',
  'Essentiel',
  0  -- pas de commission directe
);

-- Package Premium — 299$ adhésion + 99$/mois
INSERT OR IGNORE INTO packages
  (id, name, slug, price_usd, price_monthly, bv_value, bv_per_payment,
   pricing_type, payment_mode, category_id, is_active, display_order,
   description, features, title, direct_commission_rate)
VALUES (
  'pkg-synex-libre-premium',
  'Synex Libre Premium',
  'synex-libre-premium',
  299,   -- adhésion initiale
  99,    -- mensuel
  0,     -- 0 BV
  0,
  'monthly',
  'subscription',
  'cat-synex-libre',
  1,
  51,
  'Package abonnement premium avec accès étendu aux services et aux brokers Synex Libre & Kronex.',
  '["Accès étendu aux services","Lien Synex Libre (dépôt libre)","Lien Kronex (dépôt libre)","Support VIP","Accès aux formations avancées"]',
  'Premium',
  0
);

-- ── 8. Index pour les performances ──────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_subscription_renewals_member
  ON subscription_renewals(member_id, period);
CREATE INDEX IF NOT EXISTS idx_subscription_renewals_status
  ON subscription_renewals(status, grace_expires_at);
CREATE INDEX IF NOT EXISTS idx_subscription_renewals_period
  ON subscription_renewals(period, status);
CREATE INDEX IF NOT EXISTS idx_member_saved_payments_member
  ON member_saved_payments(member_id, is_active);
CREATE INDEX IF NOT EXISTS idx_broker_reg_type
  ON broker_registrations(member_id, broker_type, status);
