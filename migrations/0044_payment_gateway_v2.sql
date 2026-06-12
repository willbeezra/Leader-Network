-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 0044 — Payment Gateway V2 : modes de paiement structurés
-- ═══════════════════════════════════════════════════════════════════════════
-- Nouvelle architecture :
--   payment_methods   → catalogue de tous les modes (un enregistrement par mode)
--   payment_fees      → frais par mode (%, fixe, min, max)
--   wallet_topups     → recharges wallet membres
--   wallet_transfers  → transferts entre membres
--   proof_ai_reviews  → analyses IA des preuves de paiement
--   payment_rollbacks → historique des rollbacks BV/commissions/rangs
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. TABLE PRINCIPALE DES MODES DE PAIEMENT ────────────────────────────
-- Un enregistrement par mode (ex: Stripe, Juice, Compte BNP, Cash, etc.)
-- L'admin peut en créer autant qu'il veut dans chaque catégorie
CREATE TABLE IF NOT EXISTS payment_methods (
  id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  category     TEXT NOT NULL CHECK(category IN (
                  'card',         -- Carte bancaire (Stripe, Mollie, PayPal, etc.)
                  'bank',         -- Virement bancaire (SEPA, SWIFT, local)
                  'mobile_money', -- Mobile Money (Juice, M-Pesa, Orange Money, etc.)
                  'crypto',       -- Crypto (CoinPayments, Coinbase Commerce, etc.)
                  'cash',         -- Cash (en main, Western Union, MoneyGram)
                  'digital_wallet', -- Wallet digital (Skrill, Wise, Revolut, etc.)
                  'internal_wallet' -- Wallet interne LEADER Network
                )),
  provider     TEXT NOT NULL,    -- identifiant technique ex: 'stripe', 'juice', 'bnp_paris'
  display_name TEXT NOT NULL,    -- Nom affiché membre ex: "Juice — Île Maurice"
  description  TEXT,             -- Description courte
  logo_emoji   TEXT DEFAULT '💳', -- Emoji ou icône FA
  is_active    INTEGER NOT NULL DEFAULT 0,      -- 0=inactif, 1=actif
  requires_proof INTEGER NOT NULL DEFAULT 0,    -- 1=preuve requise, 0=automatique
  is_automatic  INTEGER NOT NULL DEFAULT 0,     -- 1=confirmation auto (API), 0=manuel
  instructions TEXT,             -- Instructions affichées au membre avant paiement
  config       TEXT NOT NULL DEFAULT '{}',      -- JSON : clés API, IBAN, numéro Juice, etc.
  sort_order   INTEGER NOT NULL DEFAULT 99,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_pm_category  ON payment_methods(category);
CREATE INDEX IF NOT EXISTS idx_pm_provider  ON payment_methods(provider);
CREATE INDEX IF NOT EXISTS idx_pm_active    ON payment_methods(is_active);

-- ── 2. FRAIS PAR MODE DE PAIEMENT ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payment_fees (
  id                TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  payment_method_id TEXT NOT NULL REFERENCES payment_methods(id) ON DELETE CASCADE,
  fee_type          TEXT NOT NULL DEFAULT 'percent' CHECK(fee_type IN ('percent','fixed','percent_plus_fixed')),
  fee_percent       REAL NOT NULL DEFAULT 0,   -- ex: 2.9 pour 2.9%
  fee_fixed         REAL NOT NULL DEFAULT 0,   -- ex: 0.30 pour 30 cents
  fee_min           REAL NOT NULL DEFAULT 0,   -- frais minimum
  fee_max           REAL NOT NULL DEFAULT 0,   -- frais maximum (0 = pas de limite)
  apply_to          TEXT NOT NULL DEFAULT 'purchase' CHECK(apply_to IN ('purchase','topup','transfer','all')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(payment_method_id, apply_to)
);

-- ── 3. RECHARGES WALLET (TOPUPS) ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wallet_topups (
  id                TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  member_id         TEXT NOT NULL REFERENCES members(id),
  payment_method_id TEXT REFERENCES payment_methods(id),
  amount_requested  REAL NOT NULL,   -- montant demandé en USD
  fee_amount        REAL NOT NULL DEFAULT 0,
  amount_to_send    REAL NOT NULL,   -- montant réel à envoyer (avec frais)
  currency          TEXT NOT NULL DEFAULT 'USD',
  status            TEXT NOT NULL DEFAULT 'pending'
                    CHECK(status IN ('pending','proof_submitted','ai_approved','confirmed','rejected','cancelled')),
  proof_url         TEXT,
  ai_score          REAL,            -- score IA (0-100)
  ai_message        TEXT,            -- message IA
  ai_reviewed_at    TEXT,
  confirmed_by      TEXT,            -- admin id
  confirmed_at      TEXT,
  rejected_by       TEXT,
  rejection_reason  TEXT,
  notes             TEXT,
  reference         TEXT,            -- référence de transaction externe
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_topups_member ON wallet_topups(member_id);
CREATE INDEX IF NOT EXISTS idx_topups_status ON wallet_topups(status);

-- ── 4. TRANSFERTS ENTRE MEMBRES ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wallet_transfers (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  sender_id       TEXT NOT NULL REFERENCES members(id),
  recipient_id    TEXT NOT NULL REFERENCES members(id),
  amount          REAL NOT NULL,
  fee_amount      REAL NOT NULL DEFAULT 0,
  net_amount      REAL NOT NULL,  -- montant reçu par le destinataire
  status          TEXT NOT NULL DEFAULT 'completed'
                  CHECK(status IN ('completed','cancelled','reversed')),
  note            TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_transfers_sender    ON wallet_transfers(sender_id);
CREATE INDEX IF NOT EXISTS idx_transfers_recipient ON wallet_transfers(recipient_id);

-- ── 5. ANALYSES IA DES PREUVES ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS proof_ai_reviews (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  reference_type  TEXT NOT NULL CHECK(reference_type IN ('order','topup','license')),
  reference_id    TEXT NOT NULL,   -- ID de la commande/topup
  proof_url       TEXT NOT NULL,
  ai_score        REAL,            -- 0-100 (confidence authentique)
  ai_verdict      TEXT CHECK(ai_verdict IN ('authentic','suspicious','invalid','error')),
  ai_message      TEXT,            -- message complet de l'IA
  ai_amount       REAL,            -- montant détecté par l'IA
  ai_date         TEXT,            -- date détectée par l'IA
  ai_currency     TEXT,
  model_used      TEXT DEFAULT 'gpt-4o',
  reviewed_at     TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(reference_type, reference_id)
);

CREATE INDEX IF NOT EXISTS idx_ai_reviews_ref ON proof_ai_reviews(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_ai_reviews_verdict ON proof_ai_reviews(ai_verdict);

-- ── 6. ROLLBACKS BV/COMMISSIONS/RANGS ────────────────────────────────────
CREATE TABLE IF NOT EXISTS payment_rollbacks (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  reference_type  TEXT NOT NULL CHECK(reference_type IN ('order','topup','license')),
  reference_id    TEXT NOT NULL,
  member_id       TEXT NOT NULL REFERENCES members(id),
  triggered_by    TEXT,            -- admin id
  reason          TEXT,
  -- Snapshot avant rollback
  bv_removed      REAL NOT NULL DEFAULT 0,
  commissions_reversed TEXT,       -- JSON array des commission IDs
  ranks_affected  TEXT,            -- JSON array des member IDs downgradés
  wallet_debited  REAL NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'completed'
                  CHECK(status IN ('completed','partial','failed')),
  details         TEXT,            -- JSON détail complet
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_rollbacks_member ON payment_rollbacks(member_id);
CREATE INDEX IF NOT EXISTS idx_rollbacks_ref    ON payment_rollbacks(reference_type, reference_id);

-- ── 7. PARAMÈTRES SYSTÈME WALLET ─────────────────────────────────────────
INSERT OR IGNORE INTO system_config (key, value) VALUES
  ('wallet_topup_min_amount',    '50'),          -- Montant minimum recharge ($)
  ('wallet_transfer_min_amount', '10'),           -- Montant minimum transfert ($)
  ('wallet_transfer_fee_type',   'fixed'),        -- Type frais transfert
  ('wallet_transfer_fee_value',  '0'),            -- Valeur frais transfert (0 = gratuit)
  ('wallet_transfer_scope',      'network'),      -- 'network' ou 'all'
  ('proof_ai_threshold',         '80'),           -- Seuil confiance IA (%)
  ('proof_ai_enabled',           'true');         -- IA activée ou non

-- ── 8. PRÉ-REMPLIR LES MODES DE PAIEMENT PAR DÉFAUT ─────────────────────

-- ─── CARTE BANCAIRE ───
INSERT OR IGNORE INTO payment_methods (id, category, provider, display_name, description, logo_emoji, is_active, requires_proof, is_automatic, instructions, config, sort_order)
VALUES
  (lower(hex(randomblob(16))), 'card', 'stripe', 'Stripe', 'Visa, Mastercard, Amex, Apple Pay, Google Pay', '💳', 0, 0, 1,
   'Paiement sécurisé par carte bancaire. Aucune donnée bancaire stockée.',
   '{"public_key":"","secret_key":"","webhook_secret":"","mode":"test"}', 1),

  (lower(hex(randomblob(16))), 'card', 'paypal', 'PayPal', 'Paiement via compte PayPal ou carte bancaire', '🅿️', 0, 0, 1,
   'Vous serez redirigé vers PayPal pour finaliser votre paiement.',
   '{"client_id":"","client_secret":"","mode":"live"}', 2),

  (lower(hex(randomblob(16))), 'card', 'mollie', 'Mollie', 'Carte bancaire — Europe (iDEAL, Bancontact, etc.)', '💳', 0, 0, 1,
   'Paiement sécurisé via Mollie.',
   '{"api_key":""}', 3),

  (lower(hex(randomblob(16))), 'card', 'square', 'Square', 'Carte bancaire — USA/Canada', '💳', 0, 0, 1,
   'Paiement sécurisé via Square.',
   '{"access_token":"","location_id":"","environment":"sandbox"}', 4),

  (lower(hex(randomblob(16))), 'card', 'adyen', 'Adyen', 'Solution entreprise multi-devises', '💳', 0, 0, 1,
   'Paiement sécurisé via Adyen.',
   '{"api_key":"","merchant_account":"","environment":"test"}', 5),

  (lower(hex(randomblob(16))), 'card', 'checkout_com', 'Checkout.com', 'Solution internationale haut volume', '💳', 0, 0, 1,
   'Paiement sécurisé via Checkout.com.',
   '{"secret_key":"","public_key":""}', 6),

  (lower(hex(randomblob(16))), 'card', 'flutterwave', 'Flutterwave', 'Afrique — Cartes et mobile money', '💳', 0, 0, 1,
   'Paiement sécurisé via Flutterwave.',
   '{"secret_key":"","public_key":""}', 7),

  (lower(hex(randomblob(16))), 'card', 'razorpay', 'Razorpay', 'Inde — Cartes, UPI, Netbanking', '💳', 0, 0, 1,
   'Paiement sécurisé via Razorpay.',
   '{"key_id":"","key_secret":""}', 8);

-- ─── VIREMENT BANCAIRE ───
INSERT OR IGNORE INTO payment_methods (id, category, provider, display_name, description, logo_emoji, is_active, requires_proof, is_automatic, instructions, config, sort_order)
VALUES
  (lower(hex(randomblob(16))), 'bank', 'sepa', 'Virement SEPA', 'Virement bancaire en Europe (2-3 jours ouvrables)', '🏦', 0, 1, 0,
   'Effectuez un virement SEPA avec les coordonnées ci-dessous, puis soumettez votre preuve.',
   '{"beneficiary":"","iban":"","bic":"","bank_name":"","reference_prefix":"LEADER"}', 1),

  (lower(hex(randomblob(16))), 'bank', 'swift', 'Virement SWIFT', 'Virement international (3-5 jours ouvrables)', '🏦', 0, 1, 0,
   'Effectuez un virement SWIFT avec les coordonnées ci-dessous, puis soumettez votre preuve.',
   '{"beneficiary":"","iban":"","swift":"","bank_name":"","bank_address":"","reference_prefix":"LEADER"}', 2),

  (lower(hex(randomblob(16))), 'bank', 'local_bank', 'Virement Local', 'Virement bancaire local (Île Maurice, Réunion, etc.)', '🏦', 0, 1, 0,
   'Effectuez le virement avec les coordonnées ci-dessous, puis soumettez votre preuve.',
   '{"beneficiary":"","account_number":"","bank_name":"","branch":"","country":"","reference_prefix":"LEADER"}', 3);

-- ─── MOBILE MONEY / WALLET MOBILE ───
INSERT OR IGNORE INTO payment_methods (id, category, provider, display_name, description, logo_emoji, is_active, requires_proof, is_automatic, instructions, config, sort_order)
VALUES
  (lower(hex(randomblob(16))), 'mobile_money', 'juice', 'Juice', 'Mobile Money — Île Maurice', '🧃', 0, 1, 0,
   'Envoyez le montant sur le numéro Juice ci-dessous, puis soumettez votre capture d''écran.',
   '{"account_number":"","phone_number":"","account_name":"","instructions_extra":""}', 1),

  (lower(hex(randomblob(16))), 'mobile_money', 'mpesa', 'M-Pesa', 'Mobile Money — Kenya, Afrique de l''Est', '📱', 0, 1, 0,
   'Envoyez via M-Pesa puis soumettez votre preuve.',
   '{"paybill_number":"","account_number":"","business_name":""}', 2),

  (lower(hex(randomblob(16))), 'mobile_money', 'orange_money', 'Orange Money', 'Mobile Money — Afrique francophone', '🟠', 0, 1, 0,
   'Envoyez via Orange Money puis soumettez votre preuve.',
   '{"merchant_code":"","phone_number":"","merchant_name":""}', 3),

  (lower(hex(randomblob(16))), 'mobile_money', 'wave', 'Wave', 'Mobile Money — Sénégal, Côte d''Ivoire', '🌊', 0, 1, 0,
   'Envoyez via Wave puis soumettez votre preuve.',
   '{"phone_number":"","account_name":""}', 4),

  (lower(hex(randomblob(16))), 'mobile_money', 'mtn_momo', 'MTN MoMo', 'Mobile Money — Afrique subsaharienne', '📱', 0, 1, 0,
   'Envoyez via MTN MoMo puis soumettez votre preuve.',
   '{"merchant_id":"","phone_number":"","merchant_name":""}', 5),

  (lower(hex(randomblob(16))), 'mobile_money', 'airtel_money', 'Airtel Money', 'Mobile Money — Afrique', '📱', 0, 1, 0,
   'Envoyez via Airtel Money puis soumettez votre preuve.',
   '{"phone_number":"","account_name":""}', 6),

  (lower(hex(randomblob(16))), 'mobile_money', 'lydia', 'Lydia / Sumeria', 'Wallet mobile — France', '💜', 0, 1, 0,
   'Envoyez via Lydia puis soumettez votre preuve.',
   '{"phone_number":"","account_name":""}', 7);

-- ─── CRYPTO ───
INSERT OR IGNORE INTO payment_methods (id, category, provider, display_name, description, logo_emoji, is_active, requires_proof, is_automatic, instructions, config, sort_order)
VALUES
  (lower(hex(randomblob(16))), 'crypto', 'coinpayments', 'CoinPayments', 'Multi-crypto : USDT, BTC, ETH, LTC et plus', '🪙', 0, 0, 1,
   'Choisissez votre cryptomonnaie et suivez les instructions CoinPayments.',
   '{"public_key":"","private_key":"","merchant_id":"","ipn_secret":"","coins":"USDT.TRC20,LTC,ETH,BTC"}', 1),

  (lower(hex(randomblob(16))), 'crypto', 'coinbase_commerce', 'Coinbase Commerce', 'Crypto simple via Coinbase', '🔵', 0, 0, 1,
   'Paiement crypto via Coinbase Commerce.',
   '{"api_key":"","webhook_secret":""}', 2),

  (lower(hex(randomblob(16))), 'crypto', 'nowpayments', 'NOWPayments', 'Multi-crypto — 300+ monnaies', '🪙', 0, 0, 1,
   'Paiement crypto via NOWPayments.',
   '{"api_key":"","ipn_secret":""}', 3),

  (lower(hex(randomblob(16))), 'crypto', 'binance_pay', 'Binance Pay', 'Paiement crypto via Binance', '🟡', 0, 0, 1,
   'Paiement via Binance Pay.',
   '{"api_key":"","api_secret":"","merchant_id":""}', 4),

  (lower(hex(randomblob(16))), 'crypto', 'btcpay', 'BTCPay Server', 'Solution auto-hébergée sans frais', '₿', 0, 1, 0,
   'Paiement via BTCPay Server. Soumettez votre preuve après paiement.',
   '{"server_url":"","api_key":"","store_id":""}', 5);

-- ─── CASH ───
INSERT OR IGNORE INTO payment_methods (id, category, provider, display_name, description, logo_emoji, is_active, requires_proof, is_automatic, instructions, config, sort_order)
VALUES
  (lower(hex(randomblob(16))), 'cash', 'cash_in_person', 'Cash en main propre', 'Remise d''espèces en personne', '💵', 0, 1, 0,
   'Remettez les espèces à votre contact désigné. Prenez une photo du reçu signé.',
   '{"contact_name":"","contact_phone":"","contact_location":"","instructions_extra":""}', 1),

  (lower(hex(randomblob(16))), 'cash', 'western_union', 'Western Union', 'Transfert d''argent international', '🌐', 0, 1, 0,
   'Effectuez votre envoi Western Union puis soumettez votre reçu.',
   '{"recipient_name":"","recipient_country":"","mtcn_required":true}', 2),

  (lower(hex(randomblob(16))), 'cash', 'moneygram', 'MoneyGram', 'Transfert d''argent international', '🌐', 0, 1, 0,
   'Effectuez votre envoi MoneyGram puis soumettez votre reçu.',
   '{"recipient_name":"","recipient_country":"","reference_required":true}', 3);

-- ─── WALLET DIGITAL ───
INSERT OR IGNORE INTO payment_methods (id, category, provider, display_name, description, logo_emoji, is_active, requires_proof, is_automatic, instructions, config, sort_order)
VALUES
  (lower(hex(randomblob(16))), 'digital_wallet', 'skrill', 'Skrill', 'Wallet digital international', '💜', 0, 1, 0,
   'Envoyez via Skrill à l''adresse indiquée puis soumettez votre preuve.',
   '{"skrill_email":"","account_name":""}', 1),

  (lower(hex(randomblob(16))), 'digital_wallet', 'neteller', 'Neteller', 'Wallet digital international', '🟢', 0, 1, 0,
   'Envoyez via Neteller puis soumettez votre preuve.',
   '{"account_id":"","account_name":""}', 2),

  (lower(hex(randomblob(16))), 'digital_wallet', 'payoneer', 'Payoneer', 'Transferts B2B internationaux', '🔵', 0, 1, 0,
   'Envoyez via Payoneer puis soumettez votre preuve.',
   '{"email":"","account_name":""}', 3),

  (lower(hex(randomblob(16))), 'digital_wallet', 'wise', 'Wise (TransferWise)', 'Transferts internationaux à frais réduits', '🟢', 0, 1, 0,
   'Envoyez via Wise puis soumettez votre preuve.',
   '{"email":"","account_name":"","currency":"USD"}', 4),

  (lower(hex(randomblob(16))), 'digital_wallet', 'revolut', 'Revolut', 'Wallet digital — Europe', '🖤', 0, 1, 0,
   'Envoyez via Revolut puis soumettez votre preuve.',
   '{"revolut_tag":"","phone_number":"","account_name":""}', 5),

  (lower(hex(randomblob(16))), 'digital_wallet', 'sumopay', 'SumoPay', 'Wallet digital — Île Maurice', '🏝️', 0, 1, 0,
   'Envoyez via SumoPay puis soumettez votre preuve.',
   '{"account_number":"","account_name":""}', 6);

-- ─── WALLET INTERNE ───
INSERT OR IGNORE INTO payment_methods (id, category, provider, display_name, description, logo_emoji, is_active, requires_proof, is_automatic, instructions, config, sort_order)
VALUES
  (lower(hex(randomblob(16))), 'internal_wallet', 'leader_wallet', 'Wallet LEADER Network',
   'Utilisez votre solde disponible sur la plateforme', '👛', 1, 0, 1,
   'Le montant sera débité instantanément de votre portefeuille LEADER Network.',
   '{}', 1);

-- ── 9. FRAIS PAR DÉFAUT (tous à 0 pour commencer) ────────────────────────
-- Seront configurables depuis l'admin sans toucher au code
INSERT OR IGNORE INTO payment_fees (id, payment_method_id, fee_type, fee_percent, fee_fixed, fee_min, fee_max, apply_to)
SELECT lower(hex(randomblob(16))), id, 'percent', 0, 0, 0, 0, 'all'
FROM payment_methods;

-- ── 10. COLONNE AI_REVIEWED SUR package_orders ───────────────────────────
-- Pour tracker si une commande a déjà été analysée par l'IA
ALTER TABLE package_orders ADD COLUMN ai_reviewed INTEGER NOT NULL DEFAULT 0;
ALTER TABLE package_orders ADD COLUMN ai_score REAL DEFAULT NULL;
ALTER TABLE package_orders ADD COLUMN ai_verdict TEXT DEFAULT NULL;
ALTER TABLE package_orders ADD COLUMN pre_validated_at TEXT DEFAULT NULL;
ALTER TABLE package_orders ADD COLUMN pre_validated_by TEXT DEFAULT 'ai';
