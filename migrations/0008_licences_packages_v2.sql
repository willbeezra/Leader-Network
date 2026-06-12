-- ============================================================
-- LEADER Network — Migration 0008
-- CDC Licences, Packages & Frais Admin v2
-- ============================================================

PRAGMA foreign_keys = OFF;

-- ── 1. TABLE PackageCategory ──────────────────────────────────
CREATE TABLE IF NOT EXISTS package_categories (
  id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name         TEXT NOT NULL UNIQUE,
  description  TEXT,
  icon         TEXT,
  is_active    INTEGER NOT NULL DEFAULT 1,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Catégories par défaut issues du CDC
INSERT OR IGNORE INTO package_categories (id, name, description, icon, is_active, display_order) VALUES
  ('cat-synex',  'SYNEX',   'Packages SYNEX — trading et investissement', '📈', 1, 1),
  ('cat-ezra',   'EZRA',    'Produits et services EZRA', '💎', 1, 2),
  ('cat-luxia',  'LUXIA',   'Offres et services Luxia', '✨', 1, 3),
  ('cat-club',   'CLUB PRIVÉ D''ÉDUCATION FINANCIÈRE', 'Formation et éducation financière premium', '🎓', 1, 4);

-- ── 2. COLONNES sur packages ──────────────────────────────────
-- category_id : catégorie parente
ALTER TABLE packages ADD COLUMN category_id TEXT REFERENCES package_categories(id);

-- pricing_type : one_time | monthly
ALTER TABLE packages ADD COLUMN pricing_type TEXT NOT NULL DEFAULT 'one_time'
  CHECK(pricing_type IN ('one_time','monthly'));

-- price_monthly : prix mensuel si pricing_type = monthly
ALTER TABLE packages ADD COLUMN price_monthly REAL DEFAULT NULL;

-- direct_commission_rate : % Valorisation Recommandation propre au package
ALTER TABLE packages ADD COLUMN direct_commission_rate REAL NOT NULL DEFAULT 10;

-- display_order : ordre dans la catégorie
ALTER TABLE packages ADD COLUMN display_order INTEGER NOT NULL DEFAULT 0;

-- currency : devise (défaut USD)
ALTER TABLE packages ADD COLUMN currency TEXT NOT NULL DEFAULT 'USD';

-- title : titre marketing (distinct du name)
ALTER TABLE packages ADD COLUMN title TEXT;

-- ── 3. Rattacher les packages existants à SYNEX ───────────────
UPDATE packages SET category_id = 'cat-synex', pricing_type = 'one_time',
  direct_commission_rate = 5
WHERE slug IN ('production','pinnacle','production_lic','pinnacle_lic');

UPDATE packages SET category_id = NULL, pricing_type = 'one_time',
  direct_commission_rate = 0
WHERE slug = 'licence';

-- ── 4. COLONNES sur members ────────────────────────────────────
-- admin_fee_paid : flag frais admin (irréversible une fois posé à true)
ALTER TABLE members ADD COLUMN admin_fee_paid INTEGER NOT NULL DEFAULT 0;

-- admin_fee_paid_at : horodatage du premier paiement de frais
ALTER TABLE members ADD COLUMN admin_fee_paid_at TEXT DEFAULT NULL;

-- package_name : nom du package actif (string, ex: "INFLUENCE")
-- Remplace l'entier package_purchased (qui reste pour rétro-compat)
ALTER TABLE members ADD COLUMN package_name TEXT DEFAULT NULL;

-- ── 5. COLONNES sur package_orders ────────────────────────────
-- admin_fee_amount : frais admin prélevés sur cette commande
ALTER TABLE package_orders ADD COLUMN admin_fee_amount REAL NOT NULL DEFAULT 0;

-- product_type : package | license | package_with_license | upgrade
ALTER TABLE package_orders ADD COLUMN product_type TEXT NOT NULL DEFAULT 'package'
  CHECK(product_type IN ('package','license','package_with_license','upgrade'));

-- upgrade_from_package_id : ID du PackageOrder source lors d'un upgrade
ALTER TABLE package_orders ADD COLUMN upgrade_from_package_id TEXT
  REFERENCES package_orders(id);

-- upgrade_diff_amount : différence de prix payée lors d'un upgrade
ALTER TABLE package_orders ADD COLUMN upgrade_diff_amount REAL DEFAULT NULL;

-- upgrade_diff_bv : différence de BV propagée lors d'un upgrade
ALTER TABLE package_orders ADD COLUMN upgrade_diff_bv REAL DEFAULT NULL;

-- ── 6. CompensationConfig — frais admin ──────────────────────
INSERT OR IGNORE INTO compensation_config (id, key, value, description) VALUES
  ('cc-admin-fee',        'admin_fee_amount', '49',   'Frais d''administration uniques prélevés au premier achat ($)'),
  ('cc-admin-fee-active', 'admin_fee_active', 'true', 'Activer/désactiver les frais admin (true/false)'),
  ('cc-lic-alert',        'license_alert_days', '7',  'Jours avant expiration licence pour déclencher alerte');

-- ── 7. Corriger activateLicense : renouvellement 365j ────────
-- (logique dans mlm.ts — migration ne touche pas le code)

-- ── 8. INDEX ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_packages_category ON packages(category_id);
CREATE INDEX IF NOT EXISTS idx_packages_active_order ON packages(is_active, display_order);
CREATE INDEX IF NOT EXISTS idx_members_admin_fee ON members(admin_fee_paid);
CREATE INDEX IF NOT EXISTS idx_pkg_orders_product_type ON package_orders(product_type);
CREATE INDEX IF NOT EXISTS idx_pkg_categories_active ON package_categories(is_active, display_order);

PRAGMA foreign_keys = ON;
