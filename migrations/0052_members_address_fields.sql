-- Migration 0052: Champs adresse et profil enrichi pour les membres
-- Ajoute : address, city, postal_code, nationality

ALTER TABLE members ADD COLUMN address TEXT DEFAULT NULL;
ALTER TABLE members ADD COLUMN city TEXT DEFAULT NULL;
ALTER TABLE members ADD COLUMN postal_code TEXT DEFAULT NULL;
ALTER TABLE members ADD COLUMN nationality TEXT DEFAULT NULL;
