-- ============================================================
-- LEADER Network — Migration 0009
-- CDC v2 — Vrais packages SYNEX + corrections
-- POSITION $600, DEVELOPPEMENT $1000, PINACLE $1500, INFLUENCE $2000
-- ============================================================

PRAGMA foreign_keys = OFF;

-- ── 1. Désactiver les anciens packages "sandbox" ─────────────
-- Production, Production+Lic, Pinnacle, Pinnacle+Lic → désactivés
-- Ils restent en DB pour les orders historiques mais n'apparaissent plus
UPDATE packages SET is_active = 0
WHERE slug IN ('production', 'production_lic', 'pinnacle', 'pinnacle_lic', 'pack-test-ci');

-- ── 2. Insérer les vrais packages SYNEX (CDC v2) ─────────────
-- Chaque package a une version sans licence et une version avec licence incluse
-- Commission directe SYNEX = 5% sur tous les packages

INSERT OR IGNORE INTO packages
  (id, name, slug, type, price_usd, bv_value, description, features, includes_license,
   category_id, pricing_type, direct_commission_rate, display_order, currency, is_active)
VALUES
  -- POSITION $600 / 1000 BV
  ('pkg-position',
   'POSITION',
   'position',
   'Production',
   600, 1000,
   'Package SYNEX POSITION — trading et investissement',
   'Accès aux outils SYNEX;1000 BV;Éligible commissions binaires;Commission recommandation 5%',
   0, 'cat-synex', 'one_time', 5, 10, 'USD', 1),

  -- DEVELOPPEMENT $1000 / 2000 BV
  ('pkg-developpement',
   'DEVELOPPEMENT',
   'developpement',
   'Production',
   1000, 2000,
   'Package SYNEX DEVELOPPEMENT — trading et investissement',
   'Accès complet SYNEX;2000 BV;Éligible commissions binaires;Commission recommandation 5%',
   0, 'cat-synex', 'one_time', 5, 20, 'USD', 1),

  -- PINACLE $1500 / 4000 BV
  ('pkg-pinacle',
   'PINACLE',
   'pinacle',
   'Pinnacle',
   1500, 4000,
   'Package SYNEX PINACLE — trading avancé et investissement',
   'Accès VIP SYNEX;4000 BV;Éligible rangs Pinnacle;Commission recommandation 5%',
   0, 'cat-synex', 'one_time', 5, 30, 'USD', 1),

  -- INFLUENCE $2000 / 6000 BV
  ('pkg-influence',
   'INFLUENCE',
   'influence',
   'Pinnacle',
   2000, 6000,
   'Package SYNEX INFLUENCE — programme premium de trading',
   'Accès Elite SYNEX;6000 BV;Éligible tous les rangs;Commission recommandation 5%',
   0, 'cat-synex', 'one_time', 5, 40, 'USD', 1);

-- ── 3. Corriger la licence seule ─────────────────────────────
UPDATE packages SET
  display_order = 0,
  direct_commission_rate = 0,
  pricing_type = 'one_time'
WHERE slug = 'licence';

-- ── 4. Index supplémentaires ─────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_packages_slug_active ON packages(slug, is_active);

PRAGMA foreign_keys = ON;
