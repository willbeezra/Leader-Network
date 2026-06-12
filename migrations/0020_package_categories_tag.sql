-- Migration 0020 : Ajout colonne `tag` sur package_categories
-- Permet de définir le badge affiché côté membre (ex: "Paiement unique", "Abonnement mensuel")
-- sans coder en dur dans le JS frontend.

ALTER TABLE package_categories ADD COLUMN tag TEXT DEFAULT NULL;

-- Valeurs initiales pour les catégories existantes
UPDATE package_categories SET tag = 'Paiement unique'    WHERE id = 'cat-synex';
UPDATE package_categories SET tag = 'Abonnement mensuel' WHERE id = 'cat-ezra';
UPDATE package_categories SET tag = 'Abonnement mensuel' WHERE id = 'cat-luxia';
UPDATE package_categories SET tag = 'Paiement unique'    WHERE id = 'cat-club';
