-- Migration 0059 : Durée de vie des packages
-- Ajoute une durée configurable par package et une date d'expiration dans les commandes
-- Les packages à abonnement mensuel (pricing_type='monthly') ne sont pas concernés

-- 1. Durée en années sur chaque package (NULL = illimité, défaut admin global)
ALTER TABLE packages ADD COLUMN duration_years INTEGER DEFAULT NULL;

-- 2. Date d'expiration calculée lors de l'activation du package
ALTER TABLE package_orders ADD COLUMN package_expires_at TEXT DEFAULT NULL;

-- 3. Paramètre global admin : durée par défaut en années (défaut : 3)
INSERT OR IGNORE INTO branding_config (key, value)
  VALUES ('package_default_duration_years', '3');
