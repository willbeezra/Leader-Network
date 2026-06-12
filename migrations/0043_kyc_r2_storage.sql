-- ============================================================
-- Migration 0043 : KYC — Migration vers R2 + Config KYC retrait
-- Ajout colonne r2_key dans kyc_documents
-- data_b64 devient nullable (migration progressive)
-- Ajout config KYC condition retrait
-- ============================================================

-- Ajouter colonne r2_key (clé R2 pour accès au fichier)
ALTER TABLE kyc_documents ADD COLUMN r2_key TEXT DEFAULT NULL;

-- Ajouter colonne r2_url pour URL signée cachée (optionnel)
ALTER TABLE kyc_documents ADD COLUMN r2_uploaded_at TEXT DEFAULT NULL;

-- Ajouter config : KYC requis pour retrait (toggle admin)
INSERT OR IGNORE INTO kyc_config (key, value, label, description, type) VALUES
  ('withdrawal_kyc_required', '0', 'KYC requis pour retrait', 'Activer pour obliger un niveau KYC minimum avant tout retrait', 'boolean'),
  ('withdrawal_kyc_min_level', '1', 'Niveau KYC minimum pour retrait', 'Niveau KYC minimum requis si la condition de retrait est activée (1, 2 ou 3)', 'number'),
  ('kyc_auto_submit_on_analyze', '1', 'Soumettre auto à l''analyse', 'Soumettre automatiquement le dossier lors de l''analyse de validation', 'boolean');

-- Mettre à jour les descriptions de niveaux pour qu'elles soient différentes
UPDATE kyc_levels SET 
  description = 'Pièce d''identité officielle (CNI, passeport ou permis) + selfie simple de face.'
WHERE id = 1;

UPDATE kyc_levels SET 
  description = 'Justificatif de domicile récent (moins de 3 mois) + selfie tenant le document.'
WHERE id = 2;

UPDATE kyc_levels SET 
  description = 'Vérification complémentaire : documents additionnels configurables par l''administrateur.'
WHERE id = 3;

-- Corriger les docs niveau 2 : retirer les docs d'identité redondants (déjà validés au niveau 1)
-- Au niveau 2, on ne redemande PAS la pièce d'identité — seulement le justificatif domicile + selfie avec doc
DELETE FROM kyc_level_docs WHERE level_id = 2 AND doc_type_id IN (
  'id_front', 'id_back', 'passport', 'driving_license_front', 'driving_license_back', 'residence_permit', 'selfie'
);

-- Niveau 2 : seulement selfie_with_doc + justificatif domicile
INSERT OR IGNORE INTO kyc_level_docs (level_id, doc_type_id, required, doc_group, sort_order) VALUES
  (2, 'selfie_with_doc',           1, NULL,           1),
  (2, 'proof_address_utility',     0, 'proof_address', 2),
  (2, 'proof_address_bank',        0, 'proof_address', 3),
  (2, 'proof_address_rent',        0, 'proof_address', 4),
  (2, 'proof_address_tax',         0, 'proof_address', 5);

-- Niveau 3 : vérification complémentaire — nettoyer et simplifier
DELETE FROM kyc_level_docs WHERE level_id = 3;

-- Niveau 3 : documents configurables admin (par défaut : déclaration sur l'honneur + relevé de compte)
INSERT OR IGNORE INTO kyc_doc_types (id, name, description, category, is_active, requires_both_sides, max_age_months, sort_order) VALUES
  ('bank_statement',    'Relevé bancaire complet',  'Relevé de compte bancaire complet (3 derniers mois)',     'address',  1, 0, 3,  13),
  ('source_of_funds',   'Justificatif de revenus',  'Fiche de paie, avis d''imposition ou tout doc prouvant vos revenus', 'other', 1, 0, 12, 14);

INSERT OR IGNORE INTO kyc_level_docs (level_id, doc_type_id, required, doc_group, sort_order) VALUES
  (3, 'selfie_with_doc',   1, NULL,          1),
  (3, 'bank_statement',    0, 'level3_proof', 2),
  (3, 'source_of_funds',   0, 'level3_proof', 3),
  (3, 'proof_address_utility', 0, 'level3_proof', 4),
  (3, 'proof_address_bank',    0, 'level3_proof', 5);
