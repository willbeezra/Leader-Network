-- ═══════════════════════════════════════════════════════════
-- Migration 0011 — Packages EZRA + Club Privé d'Éducation Financière
-- ═══════════════════════════════════════════════════════════

-- ── Catégories manquantes (idempotent) ──────────────────────
INSERT OR IGNORE INTO package_categories (id, name, icon, display_order) VALUES
  ('cat-ezra',  'EZRA',                               '💎', 2),
  ('cat-luxia', 'LUXIA',                              '✨', 3),
  ('cat-club',  'CLUB PRIVÉ D''ÉDUCATION FINANCIÈRE', '🎓', 4);

-- ── EZRA — Abonnements mensuels trading ─────────────────────
INSERT OR REPLACE INTO packages (
  id, name, slug, description, price_usd, bv_value, currency,
  features, is_active, category_id, pricing_type, price_monthly,
  direct_commission_rate, display_order, payment_mode,
  dreamiles_per_payment, bv_per_payment
) VALUES
(
  'pkg-ezra-debutant', 'Pack Débutant', 'ezra-pack-debutant',
  'Commencez votre parcours trading avec les bases solides du Forex.',
  49, 49, 'USD',
  '["5 trades/semaine sur le Forex","Accès à la communauté Débutant","Formation Débutant — MindX","QuantX — signaux de base","LexicounT — lexique trading complet","Accès à nos partenaires exclusifs","Réservez un appel coaching"]',
  1, 'cat-ezra', 'monthly', 49, 10, 1, 'subscription', 0, 49
),
(
  'pkg-ezra-avance', 'Pack Avancé', 'ezra-pack-avance',
  'Accélérez votre progression avec des signaux avancés et un coaching dédié.',
  99, 99, 'USD',
  '["10 trades/semaine sur 2 classes d''actifs","Accès à la communauté Avancée","Formation Avancée — MindX","Leadership & développement personnel","Télé Formation — replays illimités","KroneX — stratégies avancées","QuantX — signaux premium","OptimaX — optimisation de portefeuille","LexicounT — lexique trading","Nos partenaires exclusifs","Réservez un appel coaching"]',
  1, 'cat-ezra', 'monthly', 99, 10, 2, 'subscription', 0, 99
),
(
  'pkg-ezra-expert', 'Pack Expert', 'ezra-pack-expert',
  'L''accès total à l''écosystème EZRA pour les traders qui visent l''excellence.',
  149, 149, 'USD',
  '["Accès à tous les trades et services EZRA","Accès complet MindX — toutes les formations","KroneX — stratégies illimitées","LexicounT — lexique complet","Leadership & mindset du trader","Télé Formation — replays & lives","OptimaX — optimisation avancée","DynamiX — analyse dynamique de marché","Notre communauté privée","Nos partenaires exclusifs","Réservez un appel coaching prioritaire"]',
  1, 'cat-ezra', 'monthly', 149, 10, 3, 'subscription', 0, 149
),
-- ── Club Privé d'Éducation Financière — Paiements uniques ───
(
  'pkg-cpf-prestige', 'Prestige', 'cpf-prestige',
  'Comprendre • Se former • Découvrir l''écosystème',
  1499, 900, 'USD',
  '["S''ÉDUQUER — Campus LEADER accès partiel","Toutes les formations gratuites incluses","Éducation financière de base","Leadership, mindset & développement personnel","Coaching & mentorat communautaire","CRÉER — EZRA Niveau Basique","PROTÉGER — Finstrategia Essentiel tarif préférentiel","MULTIPLIER — SYNEX 100 % crédité sur votre compte plafonné à 1 499 $","MULTIPLIER — OU KRONEX capital jusqu''à 2× le montant du package","PROFITER — Luxia Pass Accès avec participation","PROFITER — LeadX","PROFITER — Élan"]',
  1, 'cat-club', 'one_time', NULL, 10, 1, 'one_time', 0, 0
),
(
  'pkg-cpf-premium', 'Premium', 'cpf-premium',
  'Structurer • Activer • Commencer à exploiter',
  1600, 500, 'EUR',
  '["S''ÉDUQUER — Campus LEADER accès partiel","Will Be Coaching inclus","Sélection de formations certifiantes","Formation certifiante RS7004 Création d''entreprise ou RS7311 Intelligence Artificielle","CRÉER — EZRA Niveau Basique","Signaux de trading inclus","Sessions de trading en direct","PROTÉGER — Finstrategia Essentiel tarif préférentiel","Will Be Pay dès lancement","MULTIPLIER — SYNEX 100 % crédité plafonné à 1 000 $","PROFITER — Luxia Pass Accès avec participation","PROFITER — LeadX","PROFITER — Élan","Financement possible via dispositifs publics — MON COMPTE FORMATION"]',
  1, 'cat-club', 'one_time', NULL, 10, 2, 'one_time', 0, 0
),
(
  'pkg-cpf-premium-plus', 'Premium Plus', 'cpf-premium-plus',
  'Accélérer • Sécuriser • Multiplier',
  3200, 1100, 'EUR',
  '["S''ÉDUQUER — Campus LEADER accès complet","Will Be Coaching inclus","Choix entre 2 formations certifiantes RS7004 ou RS7311","RS7200 — Communiquer sur les réseaux sociaux","RS6685 — Créer et gérer un site internet","CRÉER — EZRA Niveau Intermédiaire","Signaux de trading 2 classes d''actifs max 5 par jour","Trading en direct","PROTÉGER — Finstrategia Essentiel tarif préférentiel","Will Be Pay dès lancement","MULTIPLIER — SYNEX 100 % crédité plafonné à 3 000 $","MULTIPLIER — KRONEX investissement jusqu''à 3 000 $","PROFITER — Luxia Pass Accès","PROFITER — LeadX & Élan & Eventys","Financement possible via dispositifs publics — MON COMPTE FORMATION"]',
  1, 'cat-club', 'one_time', NULL, 10, 3, 'one_time', 0, 0
),
(
  'pkg-cpf-premium-executive', 'Premium Executive', 'cpf-premium-executive',
  'Déployer • Influencer • Vision long terme',
  4800, 1700, 'EUR',
  '["S''ÉDUQUER — Campus LEADER accès complet","Will Be Coaching inclus","Choix entre 3 formations certifiantes","RS7004 Création d''entreprise — RS7311 Intelligence Artificielle","RS7200 Réseaux sociaux — RS6685 Site internet","CRÉER — EZRA Niveau Avancé","Signaux illimités toutes classes d''actifs","Formations complètes + Trading en direct","Coaching de groupe + 1 coaching individuel","Accès au groupe privé exclusif","PROTÉGER — Finstrategia Essentiel accompagnement renforcé","Will Be Pay dès lancement","MULTIPLIER — SYNEX 100 % crédité plafonné à 4 500 €","MULTIPLIER — KRONEX investissement jusqu''à 6 000 $","PROFITER — Luxia Pass Signature avec participation","PROFITER — LeadX & Élan & Eventys","Financement possible via dispositifs publics — MON COMPTE FORMATION"]',
  1, 'cat-club', 'one_time', NULL, 10, 4, 'one_time', 0, 0
);
