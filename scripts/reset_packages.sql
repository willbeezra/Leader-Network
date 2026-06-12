-- ============================================================
-- RESET COMPLET PACKAGES + CATÉGORIES
-- Toutes les données issues des captures LEADER Network
-- Tout est paramétrable via l'interface admin
-- ============================================================

-- 0. Désactiver les FK temporairement pour nettoyer
PRAGMA foreign_keys = OFF;

-- 1. Supprimer les commandes de test qui référencent des packages
DELETE FROM package_orders;
DELETE FROM checkout_orders;

-- 2. Supprimer les packages existants (sauf pkg-licence qui est système)
DELETE FROM packages WHERE id != 'pkg-licence';

-- Réactiver les FK
PRAGMA foreign_keys = ON;

-- ============================================================
-- 3. Mettre à jour les catégories avec métadonnées complètes
-- ============================================================

UPDATE package_categories SET
  name        = 'SYNEX',
  description = 'Packages d''investissement et de développement réseau. Commencez là où vous êtes. Avancez vers là où vous voulez être.',
  icon        = '🚀',
  tag         = 'Paiement unique'
WHERE id = 'cat-synex';

UPDATE package_categories SET
  name        = 'EZRA',
  description = 'Packages de trading et signaux financiers. Accédez aux signaux, formations et outils de trading professionnels.',
  icon        = '📈',
  tag         = 'Abonnement mensuel'
WHERE id = 'cat-ezra';

UPDATE package_categories SET
  name        = 'LUXIA',
  description = 'Club conciergerie et lifestyle premium. Accédez à l''univers LUXIA et ses avantages exclusifs.',
  icon        = '💎',
  tag         = 'Abonnement mensuel'
WHERE id = 'cat-luxia';

UPDATE package_categories SET
  name        = 'CLUB PRIVÉ D''ÉDUCATION FINANCIÈRE',
  description = 'Formations certifiantes et accompagnement personnalisé. Financement possible via dispositifs publics (CPF).',
  icon        = '🎓',
  tag         = 'Paiement unique'
WHERE id = 'cat-club';

-- ============================================================
-- 4. PACKAGES SYNEX (paiement unique)
-- ============================================================

-- PRODUCTION — 600$ / 240 BV
INSERT INTO packages (
  id, name, slug, price_usd, bv_value, description, features,
  is_active, type, category_id, direct_commission_rate,
  display_order, includes_license, payment_mode, bv_per_payment, dreamiles_per_payment
) VALUES (
  'pkg-synex-production',
  'PRODUCTION',
  'synex-production',
  600, 240,
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
    'PROFITER : Élan',
    'Idéal pour faire ses premiers pas structurés et comprendre l''écosystème LEADER'
  ),
  1, 'Production', 'cat-synex', 5.0,
  10, 0, 'one_time', 0, 0
);

-- DÉVELOPPEMENT — 1000$ / 400 BV
INSERT INTO packages (
  id, name, slug, price_usd, bv_value, description, features,
  is_active, type, category_id, direct_commission_rate,
  display_order, includes_license, payment_mode, bv_per_payment, dreamiles_per_payment
) VALUES (
  'pkg-synex-developpement',
  'DÉVELOPPEMENT',
  'synex-developpement',
  1000, 400,
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
    'PROFITER : Eventys',
    'Idéal pour structurer ses compétences et activer plusieurs leviers dès le instantanément'
  ),
  1, 'Production', 'cat-synex', 5.0,
  20, 0, 'one_time', 0, 0
);

-- PINACLE — 1500$ / 800 BV
INSERT INTO packages (
  id, name, slug, price_usd, bv_value, description, features,
  is_active, type, category_id, direct_commission_rate,
  display_order, includes_license, payment_mode, bv_per_payment, dreamiles_per_payment
) VALUES (
  'pkg-synex-pinacle',
  'PINACLE',
  'synex-pinacle',
  1500, 800,
  'Accélérer • Sécuriser • Multiplier',
  json_array(
    'Tout le package Développement +',
    'S''ÉDUQUER : Campus LEADER complet',
    'Will be coaching – sélection de formations certifiantes gratuites',
    'CRÉER : EZRA – Avancé + Signaux illimités',
    'CRÉER : Formations complètes – Trading en direct',
    'CRÉER : Coaching de groupe',
    'PROTÉGER : Finstrategia essentiel tarif préférentiel',
    'PROTÉGER : Will be pay (dès lancement)',
    'MULTIPLIER : Synex',
    'MULTIPLIER : Lyra',
    'MULTIPLIER : KRONEX investissement jusqu''à 3 000 $',
    'MULTIPLIER : Investissements Entreprises',
    'MULTIPLIER : Investissements Immobilier',
    'PROFITER : Luxia – Pass accès • LeadX • Élan • Eventys • Stars • Nexora',
    'Idéal pour se professionnaliser et accéder aux leviers avancés'
  ),
  1, 'Pinnacle', 'cat-synex', 5.0,
  30, 0, 'one_time', 0, 0
);

-- INFLUENCE — 2000$ / 800 BV
INSERT INTO packages (
  id, name, slug, price_usd, bv_value, description, features,
  is_active, type, category_id, direct_commission_rate,
  display_order, includes_license, payment_mode, bv_per_payment, dreamiles_per_payment
) VALUES (
  'pkg-synex-influence',
  'INFLUENCE',
  'synex-influence',
  2000, 800,
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
    'Finstrategia – Essentiel (accompagnement renforcé)',
    'Idéal pour jouer un rôle clé dans l''écosystème LEADER'
  ),
  1, 'Pinnacle', 'cat-synex', 5.0,
  40, 0, 'one_time', 0, 0
);

-- ============================================================
-- 5. PACKAGES CLUB PRIVÉ D'ÉDUCATION FINANCIÈRE (paiement unique)
-- ============================================================

-- PRESTIGE — 1499$ / 900 BV
INSERT INTO packages (
  id, name, slug, price_usd, bv_value, description, features,
  is_active, type, category_id, direct_commission_rate,
  display_order, includes_license, payment_mode, bv_per_payment, dreamiles_per_payment
) VALUES (
  'pkg-club-prestige',
  'Club Privé Leader PRESTIGE',
  'club-prestige',
  1499, 900,
  'Comprendre • Se former • Découvrir l''écosystème',
  json_array(
    'S''ÉDUQUER : Campus LEADER (accès partiel)',
    'Accès à toutes les formations gratuites',
    'Éducation financière de base',
    'Leadership, mindset & développement personnel',
    'Coaching & mentorat communautaire',
    'CRÉER : EZRA – Niveau Basique',
    'PROTÉGER : Finstrategia Essentiel (tarif préférentiel)',
    'MULTIPLIER : SYNEX – Premier package 100% crédité sur le compte du client (plafonné à 1 499 $)',
    'OU MULTIPLIER : KRONEX – Capital possible jusqu''à 2× le montant du package',
    'PROFITER : Luxia – Pass Accès (avec participation)',
    'PROFITER : LeadX',
    'PROFITER : Élan',
    'Financement possible via dispositifs publics'
  ),
  1, 'Production', 'cat-club', 5.0,
  10, 0, 'one_time', 0, 0
);

-- PREMIUM — 1600$ / 500 BV
INSERT INTO packages (
  id, name, slug, price_usd, bv_value, description, features,
  is_active, type, category_id, direct_commission_rate,
  display_order, includes_license, payment_mode, bv_per_payment, dreamiles_per_payment
) VALUES (
  'pkg-club-premium',
  'Club Privé Leader PREMIUM',
  'club-premium',
  1600, 500,
  'Structurer • Activer • Commencer à exploiter',
  json_array(
    'S''ÉDUQUER : Campus LEADER (accès partiel)',
    'Will Be Coaching',
    'Sélection de formations certifiantes',
    'Formation certifiante RS7004 – Création d''entreprise ou RS7311 – Intelligence Artificielle',
    'CRÉER : EZRA – Niveau basique',
    'CRÉER : Signaux de trading',
    'CRÉER : Sessions de trading en direct',
    'PROTÉGER : Finstrategia Essential (tarif préférentiel)',
    'PROTÉGER : Will Be Pay (dès lancement)',
    'MULTIPLIER : SYNEX – Premier package 100% crédité sur votre compte (plafonné à 1 000 $)',
    'PROFITER : Luxia – Pass Accès (avec participation)',
    'PROFITER : LeadX',
    'PROFITER : Élan',
    'Financement possible via dispositifs publics'
  ),
  1, 'Production', 'cat-club', 5.0,
  20, 0, 'one_time', 0, 0
);

-- PREMIUM PLUS — 3200$ / 1100 BV
INSERT INTO packages (
  id, name, slug, price_usd, bv_value, description, features,
  is_active, type, category_id, direct_commission_rate,
  display_order, includes_license, payment_mode, bv_per_payment, dreamiles_per_payment
) VALUES (
  'pkg-club-premium-plus',
  'Club Privé Leader PREMIUM PLUS',
  'club-premium-plus',
  3200, 1100,
  'Accélérer • Sécuriser • Multiplier',
  json_array(
    'S''ÉDUQUER : Campus LEADER (accès complet)',
    'Will Be Coaching',
    'Choix entre 2 formations certifiantes : RS7004 Création d''entreprise, RS7311 Intelligence Artificielle, RS7200 Réseaux sociaux, RS6685 Site internet',
    'CRÉER : EZRA – Niveau Intermédiaire',
    'CRÉER : Signaux de trading (2 classes d''actifs, maximum 5/jour)',
    'CRÉER : Trading en direct',
    'PROTÉGER : Finstrategia Essential (tarif préférentiel)',
    'PROTÉGER : Will Be Pay (dès lancement)',
    'MULTIPLIER : SYNEX – Premier package 100% crédité sur votre compte (plafonné à 4 500 €)',
    'MULTIPLIER : KRONEX – Investissement jusqu''à 3 000 $',
    'PROFITER : Luxia – Pass Accès',
    'PROFITER : LeadX',
    'PROFITER : Élan',
    'PROFITER : Eventys',
    'Financement possible via dispositifs publics'
  ),
  1, 'Pinnacle', 'cat-club', 5.0,
  30, 0, 'one_time', 0, 0
);

-- PREMIUM EXECUTIVE — 4800$ / 1700 BV
INSERT INTO packages (
  id, name, slug, price_usd, bv_value, description, features,
  is_active, type, category_id, direct_commission_rate,
  display_order, includes_license, payment_mode, bv_per_payment, dreamiles_per_payment
) VALUES (
  'pkg-club-premium-exec',
  'Club Privé Leader PREMIUM EXECUTIVE',
  'club-premium-executive',
  4800, 1700,
  'Déployer • Influencer • Vision long terme',
  json_array(
    'S''ÉDUQUER : Campus LEADER (accès complet)',
    'Will Be Coaching',
    'Choix entre 3 formations certifiantes : RS7004 Création d''entreprise, RS7311 Intelligence Artificielle, RS7200 Réseaux sociaux, RS6685 Site internet',
    'CRÉER : EZRA – Niveau Avancé',
    'CRÉER : Signaux illimités',
    'CRÉER : Formations complètes – Trading en direct',
    'CRÉER : Coaching de groupe',
    'CRÉER : 1 coaching individuel',
    'CRÉER : Accès au groupe privé',
    'PROTÉGER : Finstrategia Essential (accompagnement renforcé)',
    'PROTÉGER : Will Be Pay (dès lancement)',
    'MULTIPLIER : SYNEX – Premier package 100% crédité sur votre compte (plafonné à 4 500 €)',
    'MULTIPLIER : KRONEX – Investissement jusqu''à 6 000 $',
    'PROFITER : Luxia – Pass Signature (avec participation)',
    'PROFITER : LeadX',
    'PROFITER : Élan',
    'PROFITER : Eventys',
    'Financement possible via dispositifs publics'
  ),
  1, 'Pinnacle', 'cat-club', 5.0,
  40, 0, 'one_time', 0, 0
);

-- ============================================================
-- 6. PACKAGES LUXIA (abonnement mensuel)
-- ============================================================

-- PASS ACCÈS — 99$/mois / 500 Dreamiles/mois
INSERT INTO packages (
  id, name, slug, price_usd, bv_value, description, features,
  is_active, type, category_id, direct_commission_rate,
  display_order, includes_license, payment_mode, bv_per_payment, dreamiles_per_payment
) VALUES (
  'pkg-luxia-pass-acces',
  'Luxia Pass Accès',
  'luxia-pass-acces',
  99, 0,
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
  1, 'Production', 'cat-luxia', 5.0,
  10, 0, 'subscription', 0, 500
);

-- SIGNATURE — 149$/mois / 2000 Dreamiles/mois
INSERT INTO packages (
  id, name, slug, price_usd, bv_value, description, features,
  is_active, type, category_id, direct_commission_rate,
  display_order, includes_license, payment_mode, bv_per_payment, dreamiles_per_payment
) VALUES (
  'pkg-luxia-signature',
  'Luxia Signature',
  'luxia-signature',
  149, 0,
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
  1, 'Pinnacle', 'cat-luxia', 5.0,
  20, 0, 'subscription', 0, 2000
);

-- ============================================================
-- 7. PACKAGES EZRA (abonnement mensuel)
-- ============================================================

-- PACK DÉBUTANT — 49$/mois
INSERT INTO packages (
  id, name, slug, price_usd, bv_value, description, features,
  is_active, type, category_id, direct_commission_rate,
  display_order, includes_license, payment_mode, bv_per_payment, dreamiles_per_payment
) VALUES (
  'pkg-ezra-debutant',
  'Pack Débutant',
  'ezra-debutant',
  49, 0,
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
  1, 'Production', 'cat-ezra', 5.0,
  10, 0, 'subscription', 49, 0
);

-- PACK AVANCÉ — 79$/mois
INSERT INTO packages (
  id, name, slug, price_usd, bv_value, description, features,
  is_active, type, category_id, direct_commission_rate,
  display_order, includes_license, payment_mode, bv_per_payment, dreamiles_per_payment
) VALUES (
  'pkg-ezra-avance',
  'Pack Avancé',
  'ezra-avance',
  79, 0,
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
  1, 'Production', 'cat-ezra', 5.0,
  20, 0, 'subscription', 79, 0
);

-- PACK EXPERT — 99$/mois
INSERT INTO packages (
  id, name, slug, price_usd, bv_value, description, features,
  is_active, type, category_id, direct_commission_rate,
  display_order, includes_license, payment_mode, bv_per_payment, dreamiles_per_payment
) VALUES (
  'pkg-ezra-expert',
  'Pack Expert',
  'ezra-expert',
  99, 0,
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
  1, 'Pinnacle', 'cat-ezra', 5.0,
  30, 0, 'subscription', 99, 0
);

-- ============================================================
-- Vérification finale
-- ============================================================
SELECT 'CATÉGORIES' as section, id, name, tag FROM package_categories ORDER BY id;
SELECT 'PACKAGES' as section, id, name, price_usd, bv_value, payment_mode, category_id FROM packages ORDER BY category_id, display_order;
