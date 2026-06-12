-- Migration 0072 : Création des tables landing_services et landing_testimonials
-- Copie des données depuis services et testimonials existants

-- 1. landing_services (même schéma que services)
CREATE TABLE IF NOT EXISTS landing_services AS SELECT * FROM services WHERE 0;
INSERT OR IGNORE INTO landing_services SELECT * FROM services;

-- 2. landing_testimonials (même schéma que testimonials)
CREATE TABLE IF NOT EXISTS landing_testimonials AS SELECT * FROM testimonials WHERE 0;
INSERT OR IGNORE INTO landing_testimonials SELECT * FROM testimonials;
