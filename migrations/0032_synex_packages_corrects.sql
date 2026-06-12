-- Migration 0032 : Packages SYNEX corrects selon la charte officielle
-- Supprime les anciens packages non-SYNEX et les versions incorrectes
-- Insère les 4 packages SYNEX officiels (PRODUCTION, DEVELOPPEMENT, PINACLE, INFLUENCE)

-- ── 1. Désactiver les anciens packages à supprimer ─────────────────────────
-- (ON NE SUPPRIME PAS pour préserver l'historique des commandes)
UPDATE packages SET is_active = 0 WHERE id IN (
  'pkg-production',
  'pkg-production-lic',
  'pkg-pinnacle',
  'pkg-pinnacle-lic',
  'pkg-cpf-prestige',
  'pkg-cpf-premium',
  'pkg-cpf-premium-plus',
  'pkg-cpf-premium-executive',
  'pkg-position',
  'pkg-position-lic',
  'pkg-ezra-debutant',
  'pkg-ezra-avance',
  'pkg-ezra-expert',
  'pkg-luxia-pass-acces',
  'pkg-luxia-signature'
);

-- ── 2. Mettre à jour les 4 packages SYNEX existants avec les bons détails ──

-- PRODUCTION — $600 / 240 BV
INSERT OR REPLACE INTO packages (
  id, name, slug, title, price_usd, bv_value, description, features,
  is_active, category_id, pricing_type, display_order, includes_license, currency
) VALUES (
  'pkg-production',
  'PRODUCTION',
  'production',
  'PRODUCTION',
  600,
  240,
  'Comprendre, se former, découvrir l''écosystème',
  '[
    {"section": "S''ÉDUQUER", "items": [
      "Campus LEADER partiel",
      "Accès aux formations fondamentales",
      "Éducation financière & compréhension des marchés",
      "Leadership, mindset & développement personnel",
      "Coaching communautaire"
    ]},
    {"section": "CRÉER", "items": [
      "Accès SYNEX",
      "EZRA — Niveau découverte"
    ]},
    {"section": "STRUCTURER", "items": [
      "Finstrategia Essentiel — tarif préférentiel"
    ]},
    {"section": "MULTIPLIER", "items": [
      "Accès à l''écosystème SYNEX"
    ]},
    {"section": "PROFITER", "items": [
      "Luxia — Pass accès participation",
      "LeadX",
      "Elan"
    ]},
    {"section": "Idéal pour", "items": [
      "Faire ses premiers pas structurés et découvrir l''écosystème LEADER"
    ]}
  ]',
  1, 'cat-synex', 'one_time', 10, 0, 'USD'
);

-- DEVELOPPEMENT — $1 000 / 400 BV
INSERT OR REPLACE INTO packages (
  id, name, slug, title, price_usd, bv_value, description, features,
  is_active, category_id, pricing_type, display_order, includes_license, currency
) VALUES (
  'pkg-developpement',
  'DEVELOPPEMENT',
  'developpement',
  'DÉVELOPPEMENT',
  1000,
  400,
  'Structurer • Activer • Commencer à exploiter',
  '[
    {"section": "S''ÉDUQUER", "items": [
      "Campus LEADER complet",
      "Sélection de formations certifiantes",
      "Will Be Coaching"
    ]},
    {"section": "CRÉER", "items": [
      "EZRA — Niveau Intermédiaire",
      "Signaux de marché sur 2 classes d''actifs",
      "Sessions de marché en direct"
    ]},
    {"section": "STRUCTURER", "items": [
      "Finstrategia Essentiel — tarif préférentiel",
      "Will Be Pay (dès lancement)"
    ]},
    {"section": "MULTIPLIER", "items": [
      "SYNEX",
      "LYRA"
    ]},
    {"section": "ACTIVER", "items": [
      "Niveau d''accès opérationnel renforcé à l''écosystème KRONEX"
    ]},
    {"section": "PROFITER", "items": [
      "Luxia — Pass accès participation",
      "LeadX",
      "Elan * Events"
    ]},
    {"section": "Idéal pour", "items": [
      "Structurer ses compétences et activer plusieurs leviers dans l''écosystème LEADER"
    ]}
  ]',
  1, 'cat-synex', 'one_time', 20, 0, 'USD'
);

-- PINACLE — $1 500 / 600 BV
INSERT OR REPLACE INTO packages (
  id, name, slug, title, price_usd, bv_value, description, features,
  is_active, category_id, pricing_type, display_order, includes_license, currency
) VALUES (
  'pkg-pinacle',
  'PINACLE',
  'pinacle',
  'PINACLE',
  1500,
  600,
  'Accélérer • Sécuriser • Déployer',
  '[
    {"section": "Tout le package Développement +", "items": []},
    {"section": "S''ÉDUQUER", "items": [
      "Campus LEADER complet",
      "Signaux de marché illimités",
      "Formations certifiantes avancées",
      "Sessions de marché en direct",
      "Coaching de groupe"
    ]},
    {"section": "CRÉER", "items": [
      "EZRA — Avancé",
      "Signaux de marché illimités",
      "Formations certifiantes avancées",
      "Sessions de marché en direct",
      "Coaching de groupe"
    ]},
    {"section": "STRUCTURER", "items": [
      "Finstrategia Essentiel — accompagnement renforcé",
      "Will Be Pay (dès lancement)"
    ]},
    {"section": "MULTIPLIER", "items": [
      "SYNEX",
      "LYRA",
      "Niveau d''exposition avancé à l''écosystème KRONEX",
      "Accès aux environnements entreprises",
      "Accès aux environnements immobiliers"
    ]},
    {"section": "PROFITER", "items": [
      "Luxia — Pass accès * LeadX",
      "Elan * Eventys * Stars * Nexara"
    ]},
    {"section": "Idéal pour", "items": [
      "Se professionnaliser et accéder aux leviers avancés de l''écosystème LEADER"
    ]}
  ]',
  1, 'cat-synex', 'one_time', 30, 0, 'USD'
);

-- INFLUENCE — $2 000 / 800 BV
INSERT OR REPLACE INTO packages (
  id, name, slug, title, price_usd, bv_value, description, features,
  is_active, category_id, pricing_type, display_order, includes_license, currency
) VALUES (
  'pkg-influence',
  'INFLUENCE',
  'influence',
  'INFLUENCE',
  2000,
  800,
  'Déployer • Influencer • Vision long terme',
  '[
    {"section": "Tout le package Pinacle +", "items": []},
    {"section": "ACCÈS PREMIUM", "items": [
      "EZRA — Avancé + coaching personnalisé",
      "KRONEX — Niveau premium d''accès opérationnel",
      "Luxia Concierge — accompagnement prioritaire",
      "Spark — Accès premium",
      "Entreprendre — Programme De 0 à 1",
      "Programme Leadership & Incentives"
    ]},
    {"section": "PRIORITÉ & ACCOMPAGNEMENT", "items": [
      "Accès prioritaire aux événements & retraites",
      "Will Be Coaching — priorité absolue",
      "Finstrategia — accompagnement renforcé"
    ]},
    {"section": "Idéal pour", "items": [
      "Jouer un rôle stratégique et développer une vision long terme dans l''écosystème LEADER"
    ]}
  ]',
  1, 'cat-synex', 'one_time', 40, 0, 'USD'
);

-- ── 3. Note frais d'administration ─────────────────────────────────────────
-- "Frais d'administration obligatoires : 49 $ par compte (paiement unique)"
-- Déjà géré via compensation_config.admin_fee_amount = 49
