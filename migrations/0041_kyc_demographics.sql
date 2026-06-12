-- Migration 0041 : Démographie KYC — date de naissance + pays d'origine
-- Ces données servent à la conformité réglementaire (AML/KYC) et aux statistiques démographiques

-- Ajouter birth_date et country_of_origin à la table members
ALTER TABLE members ADD COLUMN birth_date TEXT DEFAULT NULL;
ALTER TABLE members ADD COLUMN country_of_origin TEXT DEFAULT NULL;

-- Index pour les requêtes analytiques
CREATE INDEX IF NOT EXISTS idx_members_country ON members(country_of_origin);
CREATE INDEX IF NOT EXISTS idx_members_birth_date ON members(birth_date);

-- Rapport membres par mois (vue agrégée utile)
-- Pas de VIEW pour compatibilité D1, les calculs se feront côté requête

-- Mettre à jour la colonne updated_at des migrations
