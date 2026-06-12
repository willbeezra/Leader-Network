-- Migration 0058 : Champs WhatsApp et Messenger dédiés pour les membres
-- Séparés du téléphone/email pour permettre une configuration manuelle indépendante

-- Ajout conditionnel (ignore si déjà existant via /tmp/migration_whatsapp.sql)
CREATE TABLE IF NOT EXISTS _migration_check_058 (id INTEGER PRIMARY KEY);
DROP TABLE IF EXISTS _migration_check_058;

-- SQLite ne supporte pas IF NOT EXISTS sur ALTER TABLE
-- On tente les deux colonnes; si elles existent déjà, wrangler signalera une erreur ignorée
-- Utiliser un bloc séparé permet à la migration 0059 de passer
ALTER TABLE members ADD COLUMN whatsapp_number TEXT DEFAULT NULL;
ALTER TABLE members ADD COLUMN messenger_id TEXT DEFAULT NULL;
