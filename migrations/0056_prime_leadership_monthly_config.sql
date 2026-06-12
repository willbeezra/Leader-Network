-- Migration 0056 : Prime de Leadership — configuration mensuelle par rang
-- Ajoute 4 colonnes à rank_config pour le nouveau système de renouvellement mensuel
--
-- Règles métier :
--   min_monthly_bv_leg        : BV mensuel petite jambe minimum pour être payé à CE rang
--   min_monthly_directs       : nouveaux filleuls directs minimum recrutés CE MOIS
--   min_monthly_package_value : valeur $ minimum du package des nouvelles recrues ce mois
--   monthly_floor_ranks       : nombre de rangs sous le rang réel → en dessous = pas de paiement
--
-- Valeurs par défaut = 0 (désactivé / non bloquant) pour rétrocompatibilité

ALTER TABLE rank_config ADD COLUMN min_monthly_bv_leg REAL NOT NULL DEFAULT 0;
ALTER TABLE rank_config ADD COLUMN min_monthly_directs INTEGER NOT NULL DEFAULT 0;
ALTER TABLE rank_config ADD COLUMN min_monthly_package_value REAL NOT NULL DEFAULT 0;
ALTER TABLE rank_config ADD COLUMN monthly_floor_ranks INTEGER NOT NULL DEFAULT 0;
