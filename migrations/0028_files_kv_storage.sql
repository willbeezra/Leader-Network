-- Migration 0028 : passage au stockage KV pour les fichiers uploadés
-- data_b64 devient nullable (les nouveaux uploads stockent le binaire dans KV)
-- Les anciens enregistrements avec data_b64 restent lisibles (fallback)

-- SQLite ne supporte pas DROP COLUMN facilement — on se contente de permettre NULL
-- data_b64 était déjà TEXT sans NOT NULL constraint dans 0027, donc rien à changer
-- On ajoute juste un index sur storage pour requêtes futures

CREATE INDEX IF NOT EXISTS idx_uploaded_files_storage ON uploaded_files(storage);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_member ON uploaded_files(member_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_purpose ON uploaded_files(purpose);
