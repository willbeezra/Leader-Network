-- Migration 0068 : Intégration broker Triomarkets
-- 1. Table de suivi des inscriptions broker
-- 2. Catégorie SYNEX TRIOMARKETS
-- 3. 4 packages broker clonés depuis SYNEX (payment_mode='broker')
-- 4. Config initiale dans system_config

-- ── Table broker_registrations ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS broker_registrations (
  id          TEXT PRIMARY KEY,
  member_id   TEXT NOT NULL,
  package_id  TEXT NOT NULL,
  broker      TEXT NOT NULL DEFAULT 'triomarkets',
  status      TEXT NOT NULL DEFAULT 'pending',
  -- pending → registered → deposited → activated
  broker_customer_no TEXT,
  amount      REAL,
  currency    TEXT DEFAULT 'USD',
  tx_id       TEXT,
  is_ftd      INTEGER DEFAULT 0,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (member_id) REFERENCES members(id),
  FOREIGN KEY (package_id) REFERENCES packages(id)
);

CREATE INDEX IF NOT EXISTS idx_broker_reg_member ON broker_registrations(member_id);
CREATE INDEX IF NOT EXISTS idx_broker_reg_status ON broker_registrations(status);
CREATE INDEX IF NOT EXISTS idx_broker_reg_broker ON broker_registrations(broker);

-- ── Catégorie SYNEX TRIOMARKETS ───────────────────────────────────────────────
INSERT OR IGNORE INTO package_categories (id, name, description, icon, tag)
VALUES (
  'cat-synex-triomarkets',
  'SYNEX TRIOMARKETS',
  'Investissez via notre partenaire broker Triomarkets · BV déployés automatiquement à réception du dépôt',
  '🏦',
  'Triomarkets'
);

-- ── 4 packages broker (clones des packages SYNEX) ────────────────────────────
-- PRODUCTION TRIOMARKETS — 600$ / 12 400 BV
INSERT OR IGNORE INTO packages (
  id, name, title, slug, price_usd, bv_value, description, features,
  type, includes_license, category_id, pricing_type, payment_mode,
  display_order, currency, dreamiles_per_payment, bv_per_payment,
  duration_value, duration_unit, is_active, created_at
) VALUES (
  'pkg-trio-production',
  'PRODUCTION Triomarkets',
  'PRODUCTION Triomarkets',
  'trio-production',
  600,
  12400,
  'Comprendre, se former, découvrir l''écosystème',
  '["S''ÉDUQUER — Campus LEADER partiel","S''ÉDUQUER — Accès aux formations fondamentales","S''ÉDUQUER — Éducation financière & compréhension des marchés","S''ÉDUQUER — Leadership, mindset & développement personnel","S''ÉDUQUER — Coaching communautaire","CRÉER — Accès SYNEX","CRÉER — EZRA — Niveau découverte","STRUCTURER — Finstrategia Essentiel — tarif préférentiel","MULTIPLIER — Accès à l''écosystème SYNEX","PROFITER — Luxia — Pass accès participation","PROFITER — LeadX","PROFITER — Elan","Idéal pour — Faire ses premiers pas structurés et découvrir l''écosystème LEADER"]',
  'Production',
  0,
  'cat-synex-triomarkets',
  'one_time',
  'broker',
  10,
  'USD',
  0, 0,
  1095, 'days',
  1,
  datetime('now')
);

-- DÉVELOPPEMENT TRIOMARKETS — 1000$ / 14 000 BV
INSERT OR IGNORE INTO packages (
  id, name, title, slug, price_usd, bv_value, description, features,
  type, includes_license, category_id, pricing_type, payment_mode,
  display_order, currency, dreamiles_per_payment, bv_per_payment,
  duration_value, duration_unit, is_active, created_at
) VALUES (
  'pkg-trio-developpement',
  'DÉVELOPPEMENT Triomarkets',
  'DÉVELOPPEMENT Triomarkets',
  'trio-developpement',
  1000,
  14000,
  'Structurer · Activer · Commencer à exploiter',
  '["S''ÉDUQUER — Campus LEADER complet","S''ÉDUQUER — Sélection de formations certifiantes","S''ÉDUQUER — Will Be Coaching","CRÉER — EZRA — Niveau Intermédiaire","CRÉER — Signaux de marché sur 2 classes d''actifs","CRÉER — Sessions de marché en direct","STRUCTURER — Finstrategia Essentiel — tarif préférentiel","STRUCTURER — Will Be Pay (dès lancement)","MULTIPLIER — SYNEX","MULTIPLIER — LYRA","ACTIVER — Niveau d''accès opérationnel renforcé à l''écosystème KRONEX","PROFITER — Luxia — Pass accès participation","PROFITER — LeadX","PROFITER — Elan * Events","Idéal pour — Structurer ses compétences et activer plusieurs leviers dans l''écosystème LEADER"]',
  'Production',
  0,
  'cat-synex-triomarkets',
  'one_time',
  'broker',
  20,
  'USD',
  0, 0,
  1095, 'days',
  1,
  datetime('now')
);

-- PINACLE TRIOMARKETS — 1500$ / 16 000 BV
INSERT OR IGNORE INTO packages (
  id, name, title, slug, price_usd, bv_value, description, features,
  type, includes_license, category_id, pricing_type, payment_mode,
  display_order, currency, dreamiles_per_payment, bv_per_payment,
  duration_value, duration_unit, is_active, created_at
) VALUES (
  'pkg-trio-pinacle',
  'PINACLE Triomarkets',
  'PINACLE Triomarkets',
  'trio-pinacle',
  1500,
  16000,
  'Accélérer · Sécuriser · Déployer',
  '["Tout le package DÉVELOPPEMENT inclus","S''ÉDUQUER — Campus LEADER complet","S''ÉDUQUER — Formations certifiantes avancées","S''ÉDUQUER — Will Be Coaching","CRÉER — EZRA — Avancé","CRÉER — Signaux de marché illimités","CRÉER — Formations complètes","CRÉER — Sessions de marché en direct","CRÉER — Coaching de groupe","STRUCTURER — Finstrategia Essentiel — accompagnement renforcé","STRUCTURER — Will Be Pay (dès lancement)","MULTIPLIER — SYNEX","MULTIPLIER — LYRA","MULTIPLIER — Niveau d''exposition avancé à l''écosystème KRONEX","MULTIPLIER — Accès aux environnements entreprises","MULTIPLIER — Accès aux environnements immobiliers","PROFITER — Luxia — Pass accès * LeadX","PROFITER — Elan * Eventys * Stars * Nexara","Idéal pour — Se professionnaliser et accéder aux leviers avancés de l''écosystème LEADER"]',
  'Production',
  0,
  'cat-synex-triomarkets',
  'one_time',
  'broker',
  30,
  'USD',
  0, 0,
  1095, 'days',
  1,
  datetime('now')
);

-- INFLUENCE TRIOMARKETS — 2000$ / 200 000 BV
INSERT OR IGNORE INTO packages (
  id, name, title, slug, price_usd, bv_value, description, features,
  type, includes_license, category_id, pricing_type, payment_mode,
  display_order, currency, dreamiles_per_payment, bv_per_payment,
  duration_value, duration_unit, is_active, created_at
) VALUES (
  'pkg-trio-influence',
  'INFLUENCE Triomarkets',
  'INFLUENCE Triomarkets',
  'trio-influence',
  2000,
  200000,
  'Déployer · Influencer · Vision long terme',
  '["Tout le package PINACLE inclus","ACCÈS PREMIUM — EZRA — Avancé + coaching personnalisé","ACCÈS PREMIUM — KRONEX — Niveau premium d''accès opérationnel","ACCÈS PREMIUM — Luxia Concierge — accompagnement prioritaire","ACCÈS PREMIUM — Spark — Accès premium","ACCÈS PREMIUM — Entreprendre — Programme De 0 à 1","ACCÈS PREMIUM — Programme Leadership & Incentives","PRIORITÉ & ACCOMPAGNEMENT — Accès prioritaire aux événements & retraites","PRIORITÉ & ACCOMPAGNEMENT — Will Be Coaching — priorité absolue","PRIORITÉ & ACCOMPAGNEMENT — Finstrategia — accompagnement renforcé","Idéal pour — Jouer un rôle stratégique et développer une vision long terme dans l''écosystème LEADER"]',
  'Production',
  0,
  'cat-synex-triomarkets',
  'one_time',
  'broker',
  40,
  'USD',
  0, 0,
  1095, 'days',
  1,
  datetime('now')
);

-- ── Config broker initiale dans system_config ─────────────────────────────────
INSERT OR IGNORE INTO system_config (key, value) VALUES ('broker_triomarkets_enabled', '0');
INSERT OR IGNORE INTO system_config (key, value) VALUES ('broker_triomarkets_affiliate_url', 'https://my.triomarkets.com/live_signup?brd=1&sidc=E37C6569-9B9F-4A64-ACB5-725010215276');
INSERT OR IGNORE INTO system_config (key, value) VALUES ('broker_triomarkets_public_key', 'AE6FF11A-9821-486D-ABE7-FF137F16FA50');
INSERT OR IGNORE INTO system_config (key, value) VALUES ('broker_triomarkets_secret_key', '6fffebde285344848d237b772d2d5ae5');
INSERT OR IGNORE INTO system_config (key, value) VALUES ('broker_triomarkets_user', 'CU9051768');
INSERT OR IGNORE INTO system_config (key, value) VALUES ('broker_triomarkets_webhook_secret', '');
