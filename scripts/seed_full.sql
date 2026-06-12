-- ============================================================
-- SEED COMPLET — LEADER Network
-- Admin : root@leader-network.com / Admin123!
-- Membre test : sahil@test.com / Password123!
-- ============================================================

PRAGMA foreign_keys = OFF;

-- Nettoyer les données existantes
DELETE FROM holding_tank;
DELETE FROM dreamiles_wallet;
DELETE FROM wallets;
DELETE FROM members;
DELETE FROM package_orders;
DELETE FROM checkout_orders;
DELETE FROM packages WHERE id != 'pkg-licence';
DELETE FROM package_categories;
DELETE FROM admin_users;

-- ── ADMIN ──────────────────────────────────────────────────
INSERT INTO admin_users (id, email, name, password_hash, role, created_at) VALUES (
  'admin-000000000000000000000000',
  'root@leader-network.com',
  'Root Admin',
  'seed-salt-admin-2024:e79ef0e059d44cdef3adf7ad66edad41f7e97c42435e97c78920fdfd5ffed758',
  'super_admin',
  datetime('now')
);

-- ── CATÉGORIES PACKAGES ────────────────────────────────────
INSERT INTO package_categories (id, name, description, icon, tag, display_order) VALUES
('cat-synex', 'SYNEX',
 'Packages d''investissement et de développement réseau. Commencez là où vous êtes. Avancez vers là où vous voulez être.',
 '🚀', 'Paiement unique', 10),
('cat-club', 'CLUB PRIVÉ D''ÉDUCATION FINANCIÈRE',
 'Formations certifiantes et accompagnement personnalisé. Financement possible via dispositifs publics (CPF).',
 '🎓', 'Paiement unique', 20),
('cat-luxia', 'LUXIA',
 'Club conciergerie et lifestyle premium. Accédez à l''univers LUXIA et ses avantages exclusifs.',
 '💎', 'Abonnement mensuel', 30),
('cat-ezra', 'EZRA',
 'Packages de trading et signaux financiers. Accédez aux signaux, formations et outils de trading professionnels.',
 '📈', 'Abonnement mensuel', 40);

-- ── PACKAGE SYSTÈME : LICENCE ──────────────────────────────
INSERT OR REPLACE INTO packages (
  id, name, slug, price_usd, bv_value, description, features,
  is_active, type, category_id, direct_commission_rate, display_order,
  includes_license, payment_mode, bv_per_payment, dreamiles_per_payment
) VALUES (
  'pkg-licence', 'Licence seule', 'licence', 97, 0,
  'Licence annuelle Finstrategia',
  json_array('Accès Finstrategia pendant 1 an', 'Renouvelable annuellement'),
  1, 'Production', NULL, 0.0, 0, 0, 'one_time', 0, 0
);

-- ── SYNEX ──────────────────────────────────────────────────

INSERT INTO packages (
  id, name, slug, price_usd, bv_value, description, features,
  is_active, type, category_id, direct_commission_rate, display_order,
  includes_license, payment_mode, bv_per_payment, dreamiles_per_payment
) VALUES (
  'pkg-synex-production', 'PRODUCTION', 'synex-production', 600, 240,
  'Comprendre, se former, découvrir l''écosystème',
  json_array(
    'S''ÉDUQUER : Campus LEADER partiel',
    'Accès à toutes les formations gratuites',
    'Éducation financière de base',
    'Leadership, Mindset & développement personnel',
    'Coaching & mentorat communautaire',
    'CRÉER : Synex – niveau Basique',
    'CRÉER : Ezra – niveau Basique',
    'PROTÉGER : Finstrategia essentiel tarif préférentiel',
    'MULTIPLIER : Synex',
    'PROFITER : Luxia – Pass accès avec participation',
    'PROFITER : LeadX',
    'PROFITER : Élan'
  ),
  1, 'Production', 'cat-synex', 5.0, 10, 0, 'one_time', 0, 0
);

INSERT INTO packages (
  id, name, slug, price_usd, bv_value, description, features,
  is_active, type, category_id, direct_commission_rate, display_order,
  includes_license, payment_mode, bv_per_payment, dreamiles_per_payment
) VALUES (
  'pkg-synex-developpement', 'DÉVELOPPEMENT', 'synex-developpement', 1000, 400,
  'Structurer • Activer • Commencer à exploiter',
  json_array(
    'S''ÉDUQUER : Campus LEADER complet',
    'Will be coaching – sélection de formations certifiantes gratuites',
    'CRÉER : EZRA – niveau intermédiaire',
    'CRÉER : Signaux de trading 2 classes d''actifs maximum 5/jours',
    'CRÉER : 1 session de trading en direct',
    'PROTÉGER : Finstrategia essentiel tarif préférentiel',
    'PROTÉGER : Will be pay (dès lancement)',
    'MULTIPLIER : Synex',
    'MULTIPLIER : Lyra',
    'PROFITER : Luxia – Pass accès avec participation',
    'PROFITER : LeadX',
    'PROFITER : Élan',
    'PROFITER : Eventys'
  ),
  1, 'Production', 'cat-synex', 5.0, 20, 0, 'one_time', 0, 0
);

INSERT INTO packages (
  id, name, slug, price_usd, bv_value, description, features,
  is_active, type, category_id, direct_commission_rate, display_order,
  includes_license, payment_mode, bv_per_payment, dreamiles_per_payment
) VALUES (
  'pkg-synex-pinacle', 'PINACLE', 'synex-pinacle', 1500, 800,
  'Accélérer • Sécuriser • Multiplier',
  json_array(
    'Tout le package Développement +',
    'CRÉER : EZRA – Avancé + Signaux illimités',
    'CRÉER : Formations complètes – Trading en direct',
    'CRÉER : Coaching de groupe',
    'PROTÉGER : Finstrategia essentiel tarif préférentiel',
    'PROTÉGER : Will be pay (dès lancement)',
    'MULTIPLIER : Synex + Lyra',
    'MULTIPLIER : KRONEX investissement jusqu''à 3 000 $',
    'MULTIPLIER : Investissements Entreprises',
    'MULTIPLIER : Investissements Immobilier',
    'PROFITER : Luxia – Pass accès • LeadX • Élan • Eventys • Stars • Nexora'
  ),
  1, 'Pinnacle', 'cat-synex', 5.0, 30, 0, 'one_time', 0, 0
);

INSERT INTO packages (
  id, name, slug, price_usd, bv_value, description, features,
  is_active, type, category_id, direct_commission_rate, display_order,
  includes_license, payment_mode, bv_per_payment, dreamiles_per_payment
) VALUES (
  'pkg-synex-influence', 'INFLUENCE', 'synex-influence', 2000, 800,
  'Déployer • Influencer • Vision long terme',
  json_array(
    'Tout le package Pinacle +',
    'EZRA – Avancé + Coaching personnalisé',
    'KRONEX : Investissement jusqu''à 6 000 $',
    'Luxia – Pass Conciergerie : Abonnement 99$ au lieu de 179$',
    'Spark – Accès premium',
    'Entreprendre – Programme de 0 à 1',
    'Programme Leadership & Incentives',
    'Accès prioritaire événements & retraites',
    'Will Be Coaching – Priorité absolue',
    'Finstrategia – Essentiel (accompagnement renforcé)'
  ),
  1, 'Pinnacle', 'cat-synex', 5.0, 40, 0, 'one_time', 0, 0
);

-- ── CLUB PRIVÉ D'ÉDUCATION FINANCIÈRE ─────────────────────

INSERT INTO packages (
  id, name, slug, price_usd, bv_value, description, features,
  is_active, type, category_id, direct_commission_rate, display_order,
  includes_license, payment_mode, bv_per_payment, dreamiles_per_payment
) VALUES (
  'pkg-club-prestige', 'Club Privé Leader PRESTIGE', 'club-prestige', 1499, 900,
  'Comprendre • Se former • Découvrir l''écosystème',
  json_array(
    'S''ÉDUQUER : Campus LEADER (accès partiel)',
    'Accès à toutes les formations gratuites',
    'Éducation financière de base',
    'Leadership, mindset & développement personnel',
    'Coaching & mentorat communautaire',
    'CRÉER : EZRA – Niveau Basique',
    'PROTÉGER : Finstrategia Essentiel (tarif préférentiel)',
    'MULTIPLIER : SYNEX – Premier package 100% crédité (plafonné à 1 499 $)',
    'OU MULTIPLIER : KRONEX – Capital jusqu''à 2× le montant du package',
    'PROFITER : Luxia – Pass Accès (avec participation)',
    'PROFITER : LeadX',
    'PROFITER : Élan',
    'Financement possible via dispositifs publics'
  ),
  1, 'Production', 'cat-club', 5.0, 10, 0, 'one_time', 0, 0
);

INSERT INTO packages (
  id, name, slug, price_usd, bv_value, description, features,
  is_active, type, category_id, direct_commission_rate, display_order,
  includes_license, payment_mode, bv_per_payment, dreamiles_per_payment
) VALUES (
  'pkg-club-premium', 'Club Privé Leader PREMIUM', 'club-premium', 1600, 500,
  'Structurer • Activer • Commencer à exploiter',
  json_array(
    'S''ÉDUQUER : Campus LEADER (accès partiel)',
    'Will Be Coaching',
    'Sélection de formations certifiantes',
    'Formation certifiante RS7004 Création d''entreprise ou RS7311 Intelligence Artificielle',
    'CRÉER : EZRA – Niveau basique',
    'CRÉER : Signaux de trading + Sessions de trading en direct',
    'PROTÉGER : Finstrategia Essential (tarif préférentiel)',
    'PROTÉGER : Will Be Pay (dès lancement)',
    'MULTIPLIER : SYNEX – Premier package 100% crédité (plafonné à 1 000 $)',
    'PROFITER : Luxia – Pass Accès (avec participation)',
    'PROFITER : LeadX',
    'PROFITER : Élan',
    'Financement possible via dispositifs publics'
  ),
  1, 'Production', 'cat-club', 5.0, 20, 0, 'one_time', 0, 0
);

INSERT INTO packages (
  id, name, slug, price_usd, bv_value, description, features,
  is_active, type, category_id, direct_commission_rate, display_order,
  includes_license, payment_mode, bv_per_payment, dreamiles_per_payment
) VALUES (
  'pkg-club-premium-plus', 'Club Privé Leader PREMIUM PLUS', 'club-premium-plus', 3200, 1100,
  'Accélérer • Sécuriser • Multiplier',
  json_array(
    'S''ÉDUQUER : Campus LEADER (accès complet)',
    'Will Be Coaching',
    'Choix entre 2 formations certifiantes : RS7004, RS7311, RS7200, RS6685',
    'CRÉER : EZRA – Niveau Intermédiaire',
    'CRÉER : Signaux de trading (2 classes d''actifs, max 5/jour) + Trading en direct',
    'PROTÉGER : Finstrategia Essential (tarif préférentiel)',
    'PROTÉGER : Will Be Pay (dès lancement)',
    'MULTIPLIER : SYNEX – Premier package 100% crédité (plafonné à 4 500 €)',
    'MULTIPLIER : KRONEX – Investissement jusqu''à 3 000 $',
    'PROFITER : Luxia – Pass Accès + LeadX + Élan + Eventys',
    'Financement possible via dispositifs publics'
  ),
  1, 'Pinnacle', 'cat-club', 5.0, 30, 0, 'one_time', 0, 0
);

INSERT INTO packages (
  id, name, slug, price_usd, bv_value, description, features,
  is_active, type, category_id, direct_commission_rate, display_order,
  includes_license, payment_mode, bv_per_payment, dreamiles_per_payment
) VALUES (
  'pkg-club-premium-exec', 'Club Privé Leader PREMIUM EXECUTIVE', 'club-premium-executive', 4800, 1700,
  'Déployer • Influencer • Vision long terme',
  json_array(
    'S''ÉDUQUER : Campus LEADER (accès complet)',
    'Will Be Coaching',
    'Choix entre 3 formations certifiantes : RS7004, RS7311, RS7200, RS6685',
    'CRÉER : EZRA – Niveau Avancé',
    'CRÉER : Signaux illimités + Formations complètes + Trading en direct',
    'CRÉER : Coaching de groupe + 1 coaching individuel + Accès groupe privé',
    'PROTÉGER : Finstrategia Essential (accompagnement renforcé)',
    'PROTÉGER : Will Be Pay (dès lancement)',
    'MULTIPLIER : SYNEX – Premier package 100% crédité (plafonné à 4 500 €)',
    'MULTIPLIER : KRONEX – Investissement jusqu''à 6 000 $',
    'PROFITER : Luxia – Pass Signature (avec participation) + LeadX + Élan + Eventys',
    'Financement possible via dispositifs publics'
  ),
  1, 'Pinnacle', 'cat-club', 5.0, 40, 0, 'one_time', 0, 0
);

-- ── LUXIA ──────────────────────────────────────────────────

INSERT INTO packages (
  id, name, slug, price_usd, bv_value, description, features,
  is_active, type, category_id, direct_commission_rate, display_order,
  includes_license, payment_mode, bv_per_payment, dreamiles_per_payment
) VALUES (
  'pkg-luxia-pass-acces', 'Luxia Pass Accès', 'luxia-pass-acces', 99, 0,
  'Pour ceux qui commencent leur voyage LUXIA.',
  json_array(
    '500 points / mois',
    'Accès plateforme complète',
    'Wallet Luxia inclus',
    'Points x1 par euro dépensé',
    'Marketplace LEADX',
    'Dream Experience basique',
    'STARS Investissement'
  ),
  1, 'Production', 'cat-luxia', 5.0, 10, 0, 'subscription', 0, 500
);

INSERT INTO packages (
  id, name, slug, price_usd, bv_value, description, features,
  is_active, type, category_id, direct_commission_rate, display_order,
  includes_license, payment_mode, bv_per_payment, dreamiles_per_payment
) VALUES (
  'pkg-luxia-signature', 'Luxia Signature', 'luxia-signature', 149, 0,
  'L''expérience LUXIA dans sa version la plus complète.',
  json_array(
    '2000 points / mois',
    'Tout du Pass Accès inclus',
    'Points x3 par euro dépensé',
    'Conciergerie dédiée 24/7',
    'DreamPass complet – jusqu''à 100%',
    'DreamTour & DreamWelcome',
    'Invitations événements exclusifs',
    'Support prioritaire immédiat'
  ),
  1, 'Pinnacle', 'cat-luxia', 5.0, 20, 0, 'subscription', 0, 2000
);

-- ── EZRA ───────────────────────────────────────────────────

INSERT INTO packages (
  id, name, slug, price_usd, bv_value, description, features,
  is_active, type, category_id, direct_commission_rate, display_order,
  includes_license, payment_mode, bv_per_payment, dreamiles_per_payment
) VALUES (
  'pkg-ezra-debutant', 'Pack Débutant', 'ezra-debutant', 49, 0,
  'Premiers pas dans le trading avec signaux et formations de base.',
  json_array(
    '5 trades/semaine sur le forex',
    'Accès à la communauté débutant',
    'Formation débutant (MindX)',
    'QuantX',
    'LexicounT',
    'Nos partenaires',
    'Réservez un appel (coaching)'
  ),
  1, 'Production', 'cat-ezra', 5.0, 10, 0, 'subscription', 49, 0
);

INSERT INTO packages (
  id, name, slug, price_usd, bv_value, description, features,
  is_active, type, category_id, direct_commission_rate, display_order,
  includes_license, payment_mode, bv_per_payment, dreamiles_per_payment
) VALUES (
  'pkg-ezra-avance', 'Pack Avancé', 'ezra-avance', 79, 0,
  'Montez en compétences avec plus de trades et d''outils avancés.',
  json_array(
    '10 trades/semaine',
    'Accès à la communauté avancée',
    'Formation avancée (MindX)',
    'Leadership',
    'Télé Formation',
    'KroneX',
    'QuantX',
    'Optimax',
    'Réservez un appel (coaching)',
    'Nos partenaires',
    'LexicounT'
  ),
  1, 'Production', 'cat-ezra', 5.0, 20, 0, 'subscription', 79, 0
);

INSERT INTO packages (
  id, name, slug, price_usd, bv_value, description, features,
  is_active, type, category_id, direct_commission_rate, display_order,
  includes_license, payment_mode, bv_per_payment, dreamiles_per_payment
) VALUES (
  'pkg-ezra-expert', 'Pack Expert', 'ezra-expert', 99, 0,
  'Accès complet à tous les services et outils professionnels Ezra.',
  json_array(
    'Accès à tous les trades et services Ezra',
    'Accès complet à MindX pour toutes les formations',
    'KroneX',
    'LexicounT',
    'Leadership',
    'Mindset du trader',
    'Télé Formation',
    'OptimaX',
    'DynamiX',
    'Notre communauté',
    'Nos partenaires',
    'Réservez un appel (coaching)'
  ),
  1, 'Pinnacle', 'cat-ezra', 5.0, 30, 0, 'subscription', 99, 0
);

-- ── MEMBRES DE TEST ────────────────────────────────────────

INSERT INTO members (
  id, unique_id, email, password_hash,
  first_name, last_name, phone, country,
  member_status, sponsor_id, binary_position,
  current_rank, license_active,
  kyc_status, admin_fee_paid, activation_done,
  in_holding_tank, fast_start_completed,
  created_at, updated_at
) VALUES
(
  'mem-sahil-00000000000000000000000', 'LN-00001', 'sahil@test.com',
  'seed-salt-member-2024:e94e261c76f83edd4af9c0e55f1427fa886c60e78c98267ba0b00225d8472c0f',
  'Sahil', 'Kumar', '+33600000001', 'France',
  'AMI', NULL, NULL,
  'none', 1,
  'verified', 1, 1,
  0, 0,
  datetime('now', '-60 days'), datetime('now')
),
(
  'mem-priya-00000000000000000000000', 'LN-00002', 'priya@test.com',
  'seed-salt-member-2024:e94e261c76f83edd4af9c0e55f1427fa886c60e78c98267ba0b00225d8472c0f',
  'Priya', 'Sharma', '+33600000002', 'France',
  'AMI', 'mem-sahil-00000000000000000000000', 'L',
  'none', 1,
  'verified', 1, 1,
  0, 0,
  datetime('now', '-55 days'), datetime('now')
),
(
  'mem-ravi-000000000000000000000000', 'LN-00003', 'ravi@test.com',
  'seed-salt-member-2024:e94e261c76f83edd4af9c0e55f1427fa886c60e78c98267ba0b00225d8472c0f',
  'Ravi', 'Patel', '+33600000003', 'Île Maurice',
  'AMI', 'mem-sahil-00000000000000000000000', 'R',
  'none', 1,
  'pending', 0, 0,
  0, 0,
  datetime('now', '-50 days'), datetime('now')
),
(
  'mem-anita-00000000000000000000000', 'LN-00004', 'anita@test.com',
  'seed-salt-member-2024:e94e261c76f83edd4af9c0e55f1427fa886c60e78c98267ba0b00225d8472c0f',
  'Anita', 'Singh', '+33600000004', 'France',
  'Partenaire', 'mem-priya-00000000000000000000000', 'L',
  'Manager', 1,
  'verified', 1, 1,
  0, 0,
  datetime('now', '-45 days'), datetime('now')
),
(
  'mem-mohan-00000000000000000000000', 'LN-00005', 'mohan@test.com',
  'seed-salt-member-2024:e94e261c76f83edd4af9c0e55f1427fa886c60e78c98267ba0b00225d8472c0f',
  'Mohan', 'Das', '+33600000005', 'Île Maurice',
  'AMI', 'mem-priya-00000000000000000000000', 'R',
  'none', 0,
  'not_submitted', 0, 0,
  0, 0,
  datetime('now', '-40 days'), datetime('now')
),
(
  'mem-will-be-000000000000000000000', 'LN-00006', 'willbe@test.com',
  'seed-salt-member-2024:e94e261c76f83edd4af9c0e55f1427fa886c60e78c98267ba0b00225d8472c0f',
  'Will', 'Be', '+33600000006', 'France',
  'AMI', 'mem-sahil-00000000000000000000000', NULL,
  'none', 0,
  'not_submitted', 0, 0,
  1, 0,
  datetime('now', '-5 days'), datetime('now')
);

-- ── WALLETS ────────────────────────────────────────────────
INSERT INTO wallets (id, member_id, balance, pending_balance, credit_croissance, reserve_strategique, total_earned, total_withdrawn, updated_at) VALUES
('wal-sahil', 'mem-sahil-00000000000000000000000', 250.00, 0, 0, 0, 250.00, 0, datetime('now')),
('wal-priya', 'mem-priya-00000000000000000000000', 0, 0, 0, 0, 0, 0, datetime('now')),
('wal-ravi',  'mem-ravi-000000000000000000000000', 0, 0, 0, 0, 0, 0, datetime('now')),
('wal-anita', 'mem-anita-00000000000000000000000', 125.00, 0, 0, 0, 125.00, 0, datetime('now')),
('wal-mohan', 'mem-mohan-00000000000000000000000', 0, 0, 0, 0, 0, 0, datetime('now')),
('wal-will',  'mem-will-be-000000000000000000000', 0, 0, 0, 0, 0, 0, datetime('now'));

-- ── DREAMILES WALLETS ──────────────────────────────────────
INSERT INTO dreamiles_wallet (id, member_id, dreamiles, total_earned, total_converted) VALUES
('drm-sahil', 'mem-sahil-00000000000000000000000', 0, 0, 0),
('drm-priya', 'mem-priya-00000000000000000000000', 0, 0, 0),
('drm-ravi',  'mem-ravi-000000000000000000000000', 0, 0, 0),
('drm-anita', 'mem-anita-00000000000000000000000', 0, 0, 0),
('drm-mohan', 'mem-mohan-00000000000000000000000', 0, 0, 0),
('drm-will',  'mem-will-be-000000000000000000000', 0, 0, 0);

-- ── HOLDING TANK ───────────────────────────────────────────
INSERT INTO holding_tank (
  id, member_id, sponsor_id, status,
  admin_can_place, sponsor_deadline_at,
  placed_by, placed_at, created_at
) VALUES (
  'ht-willbe-000000000000000000000000',
  'mem-will-be-000000000000000000000',
  'mem-sahil-00000000000000000000000',
  'waiting', 0,
  datetime('now', '+10 days'),
  NULL, NULL,
  datetime('now', '-5 days')
);

PRAGMA foreign_keys = ON;

-- Vérification finale
SELECT
  (SELECT COUNT(*) FROM admin_users)        as admins,
  (SELECT COUNT(*) FROM members)            as membres,
  (SELECT COUNT(*) FROM package_categories) as categories,
  (SELECT COUNT(*) FROM packages)           as packages,
  (SELECT COUNT(*) FROM wallets)            as wallets,
  (SELECT COUNT(*) FROM holding_tank)       as holding_tank;
