-- Migration 0079 : Accès services par package
-- Table de jointure package ↔ service
-- 100% configurable via admin, aucun hardcode

CREATE TABLE IF NOT EXISTS package_service_access (
  package_id  TEXT    NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  service_id  INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  is_enabled  INTEGER NOT NULL DEFAULT 0 CHECK(is_enabled IN (0,1)),
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_by  TEXT,   -- admin_user id qui a fait la modif (audit)
  PRIMARY KEY (package_id, service_id)
);

-- Index pour la route membre (lookup par package_id)
CREATE INDEX IF NOT EXISTS idx_psa_package ON package_service_access(package_id);
-- Index pour lookup par service_id
CREATE INDEX IF NOT EXISTS idx_psa_service ON package_service_access(service_id);

-- Pré-remplir la matrice avec is_enabled=0 pour tous les couples existants
-- (package actif × service actif) → tout désactivé par défaut, admin configure ensuite
INSERT OR IGNORE INTO package_service_access (package_id, service_id, is_enabled)
SELECT p.id, s.id, 0
FROM packages p
CROSS JOIN services s
WHERE p.deleted_at IS NULL
  AND p.is_active = 1
  AND s.status = 'active';
