-- Migration 0066 : Soft-delete pour les packages
-- Ajoute deleted_at pour permettre la suppression définitive côté admin
-- sans casser les commandes (package_orders) existantes via FK

ALTER TABLE packages ADD COLUMN deleted_at TEXT DEFAULT NULL;
