-- ============================================================
-- Migration 0002 — Corrections plan de compensation LEADER Network
-- Basé sur CDC v6.0
-- ============================================================

-- 1. Ajouter colonnes manquantes sur packages
ALTER TABLE packages ADD COLUMN type TEXT DEFAULT 'Production';
ALTER TABLE packages ADD COLUMN includes_license INTEGER DEFAULT 0;

-- 2. Corriger les packages (prix et BV selon CDC v6.0)
DELETE FROM packages;
INSERT INTO packages (id, name, slug, type, price_usd, bv_value, includes_license, description, is_active) VALUES
  ('pkg-production',     'Production',           'production',     'Production', 297,  800,  0, 'Package Production seul — 800 BV', 1),
  ('pkg-pinnacle',       'Pinnacle',             'pinnacle',       'Pinnacle',   597,  1600, 0, 'Package Pinnacle seul — 1 600 BV', 1),
  ('pkg-pinnacle-lic',   'Pinnacle + Licence',   'pinnacle_lic',   'Pinnacle',   697,  1600, 1, 'Package Pinnacle + Licence Finstrategia — 1 600 BV', 1),
  ('pkg-licence',        'Licence seule',        'licence',        'Licence',    97,   0,    1, 'Licence Finstrategia seule — 0 BV', 1);

-- 3. Corriger la table rank_config avec les valeurs exactes du CDC
DELETE FROM rank_config;
INSERT INTO rank_config (id, rank_name, rank_order, min_bv_leg, min_directs, required_package_type, monthly_prime, monthly_cap) VALUES
  ('rc-1',  'Administrator', 1,  400,      1,  'Production', 50,     100),
  ('rc-2',  'Manager',       2,  2000,     1,  'Production', 150,    300),
  ('rc-3',  'Captain',       3,  6000,     2,  'Pinnacle',   600,    1000),
  ('rc-4',  'Leader',        4,  12500,    2,  'Pinnacle',   1500,   2500),
  ('rc-5',  'Mentor',        5,  35000,    2,  'Pinnacle',   3000,   5000),
  ('rc-6',  'Superviseur',   6,  80000,    4,  'Pinnacle',   7000,   10000),
  ('rc-7',  'Executive',     7,  170000,   2,  'Pinnacle',   12000,  15000),
  ('rc-8',  'President',     8,  350000,   5,  'Pinnacle',   20000,  30000),
  ('rc-9',  'Director',      9,  700000,   6,  'Pinnacle',   50000,  60000),
  ('rc-10', 'Boss',          10, 1400000,  8,  'Pinnacle',   70000,  85000),
  ('rc-11', 'Visionary',     11, 2800000,  12, 'Pinnacle',   100000, 120000);

-- 4. Corriger influence_config (sans colonne description)
DELETE FROM influence_config;
INSERT INTO influence_config (id, level, percentage) VALUES
  ('inf-1', 1, 8),
  ('inf-2', 2, 5),
  ('inf-3', 3, 3),
  ('inf-4', 4, 2),
  ('inf-5', 5, 2);

-- 5. Corriger fast_start_config (sans colonne description)
DELETE FROM fast_start_config;
INSERT INTO fast_start_config (id, bv_threshold, bonus_amount) VALUES
  ('fs-1', 1500,  50),
  ('fs-2', 3000,  150),
  ('fs-3', 5000,  300),
  ('fs-4', 10000, 500);

-- 6. Table BVQueue (propagation asynchrone)
CREATE TABLE IF NOT EXISTS bv_queue (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL,
  package_order_id TEXT NOT NULL,
  bv_amount REAL NOT NULL,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending','processing','done','error')),
  attempts INTEGER DEFAULT 0,
  last_error TEXT,
  period TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  processed_at DATETIME,
  FOREIGN KEY (member_id) REFERENCES members(id)
);

-- 7. Table CommissionQueue (paiement M+1 journalier)
CREATE TABLE IF NOT EXISTS commission_queue (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL,
  period TEXT NOT NULL,
  commission_id TEXT,
  amount_per_day REAL NOT NULL,
  total_amount REAL NOT NULL,
  days_in_month INTEGER NOT NULL,
  days_paid INTEGER DEFAULT 0,
  start_date TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK(status IN ('pending','active','completed','cancelled')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (member_id) REFERENCES members(id)
);

-- 8. Table RankQueue (recalcul rang asynchrone)
CREATE TABLE IF NOT EXISTS rank_queue (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL,
  trigger_event TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending','done','error')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  processed_at DATETIME,
  FOREIGN KEY (member_id) REFERENCES members(id)
);

-- 9. Ajouter colonnes manquantes sur members
ALTER TABLE members ADD COLUMN personal_bv_total REAL DEFAULT 0;
ALTER TABLE members ADD COLUMN fast_start_bv REAL DEFAULT 0;
ALTER TABLE members ADD COLUMN pending_withdrawal REAL DEFAULT 0;
ALTER TABLE members ADD COLUMN activation_done INTEGER DEFAULT 0;
ALTER TABLE members ADD COLUMN package_type TEXT DEFAULT NULL;
ALTER TABLE members ADD COLUMN package_purchased INTEGER DEFAULT 0;

-- 10. Ajouter colonnes manquantes sur package_orders
ALTER TABLE package_orders ADD COLUMN activation_done INTEGER DEFAULT 0;
ALTER TABLE package_orders ADD COLUMN is_first_package INTEGER DEFAULT 0;

-- 11. Compensation config complète (clé UNIQUE → upsert-safe)
DELETE FROM compensation_config;
INSERT INTO compensation_config (id, key, value, description) VALUES
  ('cc-1',  'min_personal_bv',          '300',       'BV personnel minimum mensuel pour validation'),
  ('cc-2',  'min_active_clients',        '1',         'Nombre minimum de clients actifs (alternative BV)'),
  ('cc-3',  'payment_day',               'wednesday', 'Jour de paiement hebdo M+1'),
  ('cc-4',  'fast_start_days',           '30',        'Durée Fast Start en jours'),
  ('cc-5',  'min_withdrawal',            '50',        'Montant minimum de retrait ($)'),
  ('cc-6',  'recommendation_pct',        '10',        '% Valorisation Recommandation'),
  ('cc-7',  'credit_croissance_pct',     '20',        '% Crédit de Croissance (rang Leader+)'),
  ('cc-8',  'reserve_strategique_pct',   '10',        '% Réserve Stratégique (rang Mentor+)'),
  ('cc-9',  'rayonnement_pct',           '10',        '% Bonus Rayonnement (Captain+ Pinnacle)'),
  ('cc-10', 'abondement_mentor_pct',     '10',        '% Abondement Réserve (Mentor/Superviseur)'),
  ('cc-11', 'abondement_executive_pct',  '20',        '% Abondement Réserve (Executive+)');

-- 12. BonusConfig complète
DELETE FROM bonus_config;
INSERT INTO bonus_config (id, key, value, description) VALUES
  ('bc-1', 'credit_croissance_enabled',   'true',   'Activer Crédit de Croissance'),
  ('bc-2', 'credit_croissance_rank',      'Leader', 'Rang minimum Crédit de Croissance'),
  ('bc-3', 'reserve_strategique_enabled', 'true',   'Activer Réserve Stratégique'),
  ('bc-4', 'reserve_strategique_rank',    'Mentor', 'Rang minimum Réserve Stratégique'),
  ('bc-5', 'rayonnement_enabled',         'true',   'Activer Bonus Rayonnement'),
  ('bc-6', 'influence_enabled',           'true',   'Activer Bonus Influence'),
  ('bc-7', 'fast_start_enabled',          'true',   'Activer Fast Start Bonus'),
  ('bc-8', 'recommendation_enabled',      'true',   'Activer Valorisation Recommandation');

-- 13. Index pour les nouvelles tables
CREATE INDEX IF NOT EXISTS idx_bv_queue_status   ON bv_queue(status, created_at);
CREATE INDEX IF NOT EXISTS idx_bv_queue_member   ON bv_queue(member_id);
CREATE INDEX IF NOT EXISTS idx_comm_queue_status ON commission_queue(status, created_at);
CREATE INDEX IF NOT EXISTS idx_rank_queue_status ON rank_queue(status, created_at);
CREATE INDEX IF NOT EXISTS idx_rank_queue_member ON rank_queue(member_id);
