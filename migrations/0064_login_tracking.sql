-- Migration 0064 : Tracking de la dernière connexion par IP
-- Utilisé pour détecter une connexion depuis un nouvel appareil/IP

ALTER TABLE members ADD COLUMN last_login_ip TEXT DEFAULT NULL;
ALTER TABLE members ADD COLUMN last_login_at DATETIME DEFAULT NULL;
