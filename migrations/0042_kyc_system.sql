-- ============================================================
-- Migration 0042 : Système KYC complet et paramétrable
-- Inspiré des meilleurs systèmes mondiaux (Jumio, Onfido, Sumsub)
-- RIEN n'est hardcodé — tout est configurable depuis l'admin
-- ============================================================

-- ── 1. CONFIG GÉNÉRALE KYC ──────────────────────────────────
-- Tous les paramètres globaux KYC modifiables depuis l'admin
CREATE TABLE IF NOT EXISTS kyc_config (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  label TEXT NOT NULL,        -- Libellé affiché en admin
  description TEXT,           -- Explication du paramètre
  type  TEXT DEFAULT 'text',  -- text | number | boolean | json
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Valeurs par défaut
INSERT OR IGNORE INTO kyc_config (key, value, label, description, type) VALUES
  ('kyc_enabled',           '1',    'KYC activé',                   'Activer ou désactiver tout le système KYC',                    'boolean'),
  ('max_file_size_mb',      '10',   'Taille max fichier (MB)',       'Taille maximale autorisée pour chaque document uploadé',       'number'),
  ('accepted_formats',      '["image/jpeg","image/png","application/pdf"]', 'Formats acceptés', 'Formats MIME autorisés pour les documents', 'json'),
  ('review_sla_hours',      '48',   'SLA révision (heures)',         'Délai cible de traitement d''un dossier par l''admin',          'number'),
  ('kyc_expiry_days',       '365',  'Expiration KYC (jours)',        'Durée de validité d''un KYC approuvé avant renouvellement',    'number'),
  ('withdrawal_level_0',    '0',    'Plafond retrait niveau 0 ($)',  'Montant max retrait sans KYC (0 = bloqué)',                    'number'),
  ('withdrawal_level_1',    '500',  'Plafond retrait niveau 1 ($)',  'Montant max retrait mensuel avec KYC niveau 1',                'number'),
  ('withdrawal_level_2',    '5000', 'Plafond retrait niveau 2 ($)',  'Montant max retrait mensuel avec KYC niveau 2',                'number'),
  ('withdrawal_level_3',    '0',    'Plafond retrait niveau 3 ($)', 'Montant max retrait mensuel avec KYC niveau 3 (0 = illimité)', 'number'),
  ('auto_approve_enabled',  '0',    'Approbation automatique',       'Approuver automatiquement si tous les checks passent',         'boolean'),
  ('notify_member_email',   '1',    'Email membre (soumission/décision)', 'Envoyer email au membre à chaque changement de statut', 'boolean'),
  ('notify_admin_queue',    '1',    'Alerte admin (nouvelle soumission)', 'Notifier les admins quand un dossier arrive en queue',   'boolean'),
  ('max_resubmit_attempts', '5',    'Tentatives re-soumission max',  'Nombre maximum de re-soumissions autorisées par niveau',       'number'),
  ('flag_duplicate_doc',    '1',    'Détecter documents en double',  'Alerter si le même document est soumis par 2 membres',         'boolean'),
  ('flag_expired_doc',      '1',    'Détecter documents expirés',    'Alerter automatiquement si un document est expiré',            'boolean'),
  ('flag_name_mismatch',    '1',    'Détecter incohérence de nom',   'Alerter si le nom extrait diffère du profil membre',           'boolean');

-- ── 2. NIVEAUX KYC ──────────────────────────────────────────
-- Les niveaux sont entièrement paramétrables
CREATE TABLE IF NOT EXISTS kyc_levels (
  id          INTEGER PRIMARY KEY,   -- 0, 1, 2, 3...
  name        TEXT NOT NULL,          -- "Non vérifié", "Identité vérifiée"...
  description TEXT,                   -- Affiché au membre
  is_active   INTEGER DEFAULT 1,      -- Peut être désactivé
  sort_order  INTEGER DEFAULT 0,
  created_at  TEXT DEFAULT (datetime('now')),
  updated_at  TEXT DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO kyc_levels (id, name, description, is_active, sort_order) VALUES
  (0, 'Non vérifié',         'Aucune vérification effectuée. Accès limité.',                                            1, 0),
  (1, 'Identité vérifiée',   'Pièce d''identité et selfie vérifiés. Retraits débloqués jusqu''au plafond niveau 1.',   1, 1),
  (2, 'Identité renforcée',  'Identité + justificatif de domicile. Retraits débloqués jusqu''au plafond niveau 2.',    1, 2),
  (3, 'KYC Premium',         'Vérification complète. Accès aux retraits illimités.',                                    1, 3);

-- ── 3. TYPES DE DOCUMENTS ───────────────────────────────────
-- Entièrement paramétrables : ajouter/retirer/désactiver
CREATE TABLE IF NOT EXISTS kyc_doc_types (
  id            TEXT PRIMARY KEY,        -- 'id_front', 'passport', etc.
  name          TEXT NOT NULL,            -- "CNI Recto", "Passeport"...
  description   TEXT,                     -- Instructions pour le membre
  category      TEXT NOT NULL,            -- 'identity' | 'address' | 'other'
  is_active     INTEGER DEFAULT 1,        -- Peut être désactivé
  requires_both_sides INTEGER DEFAULT 0,  -- Recto + verso obligatoires
  max_age_months INTEGER DEFAULT NULL,    -- Null = pas de limite d'âge
  example_url   TEXT DEFAULT NULL,        -- URL image exemple (optionnel)
  sort_order    INTEGER DEFAULT 0,
  created_at    TEXT DEFAULT (datetime('now')),
  updated_at    TEXT DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO kyc_doc_types (id, name, description, category, is_active, requires_both_sides, max_age_months, sort_order) VALUES
  ('id_front',        'CNI — Recto',                   'Face avant de votre carte nationale d''identité',                                           'identity', 1, 0, NULL,  1),
  ('id_back',         'CNI — Verso',                   'Face arrière de votre carte nationale d''identité',                                          'identity', 1, 0, NULL,  2),
  ('passport',        'Passeport',                     'Page principale de votre passeport (photo + données)',                                        'identity', 1, 0, NULL,  3),
  ('driving_license_front', 'Permis de conduire — Recto', 'Face avant de votre permis de conduire',                                                 'identity', 1, 0, NULL,  4),
  ('driving_license_back',  'Permis de conduire — Verso', 'Face arrière de votre permis de conduire',                                               'identity', 1, 0, NULL,  5),
  ('residence_permit','Titre de séjour',               'Titre de séjour en cours de validité (recto)',                                               'identity', 1, 0, NULL,  6),
  ('selfie',          'Selfie (photo de face)',         'Photo de vous de face, visage bien visible, fond neutre',                                    'identity', 1, 0, NULL,  7),
  ('selfie_with_doc', 'Selfie avec document',          'Photo de vous tenant votre pièce d''identité à côté de votre visage',                       'identity', 1, 0, NULL,  8),
  ('proof_address_utility', 'Facture énergie/eau/gaz', 'Facture électricité, gaz ou eau de moins de 3 mois',                                        'address',  1, 0, 3,     9),
  ('proof_address_bank',    'Relevé bancaire',         'Relevé de compte bancaire de moins de 3 mois',                                              'address',  1, 0, 3,    10),
  ('proof_address_rent',    'Quittance de loyer',      'Quittance de loyer de moins de 3 mois',                                                     'address',  1, 0, 3,    11),
  ('proof_address_tax',     'Avis d''imposition',      'Dernier avis d''imposition',                                                                'address',  1, 0, 14,   12);

-- ── 4. DOCUMENTS REQUIS PAR NIVEAU ──────────────────────────
-- Liaison niveau ↔ types de documents — tout paramétrable
-- required: 1=obligatoire, 0=optionnel
-- min_docs_from_group: si > 0, le membre doit fournir au moins N docs du groupe
CREATE TABLE IF NOT EXISTS kyc_level_docs (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  level_id      INTEGER NOT NULL REFERENCES kyc_levels(id),
  doc_type_id   TEXT NOT NULL REFERENCES kyc_doc_types(id),
  required      INTEGER DEFAULT 1,   -- 1=obligatoire, 0=optionnel
  doc_group     TEXT DEFAULT NULL,   -- Ex: 'identity_main' → au moins 1 du groupe requis
  sort_order    INTEGER DEFAULT 0,
  created_at    TEXT DEFAULT (datetime('now')),
  UNIQUE(level_id, doc_type_id)
);

-- Niveau 1 : 1 pièce d'identité (CNI recto+verso OU passeport OU permis) + selfie
INSERT OR IGNORE INTO kyc_level_docs (level_id, doc_type_id, required, doc_group, sort_order) VALUES
  -- Au moins 1 document du groupe 'id_primary' requis (CNI OU passeport OU permis)
  (1, 'id_front',                  1, 'id_primary', 1),
  (1, 'id_back',                   0, 'id_primary', 2),
  (1, 'passport',                  0, 'id_primary', 3),
  (1, 'driving_license_front',     0, 'id_primary', 4),
  (1, 'driving_license_back',      0, 'id_primary', 5),
  (1, 'residence_permit',          0, 'id_primary', 6),
  (1, 'selfie',                    1, NULL,          7),
  (1, 'selfie_with_doc',           1, NULL,          8);

-- Niveau 2 : tout niveau 1 + justificatif domicile (au moins 1 du groupe 'proof_address')
INSERT OR IGNORE INTO kyc_level_docs (level_id, doc_type_id, required, doc_group, sort_order) VALUES
  (2, 'id_front',                  1, 'id_primary', 1),
  (2, 'id_back',                   0, 'id_primary', 2),
  (2, 'passport',                  0, 'id_primary', 3),
  (2, 'driving_license_front',     0, 'id_primary', 4),
  (2, 'driving_license_back',      0, 'id_primary', 5),
  (2, 'residence_permit',          0, 'id_primary', 6),
  (2, 'selfie',                    1, NULL,          7),
  (2, 'selfie_with_doc',           1, NULL,          8),
  (2, 'proof_address_utility',     0, 'proof_address', 9),
  (2, 'proof_address_bank',        0, 'proof_address', 10),
  (2, 'proof_address_rent',        0, 'proof_address', 11),
  (2, 'proof_address_tax',         0, 'proof_address', 12);

-- Niveau 3 : tout niveau 2 (même documents, pas de source de fonds)
INSERT OR IGNORE INTO kyc_level_docs (level_id, doc_type_id, required, doc_group, sort_order) VALUES
  (3, 'id_front',                  1, 'id_primary', 1),
  (3, 'id_back',                   0, 'id_primary', 2),
  (3, 'passport',                  0, 'id_primary', 3),
  (3, 'driving_license_front',     0, 'id_primary', 4),
  (3, 'driving_license_back',      0, 'id_primary', 5),
  (3, 'residence_permit',          0, 'id_primary', 6),
  (3, 'selfie',                    1, NULL,          7),
  (3, 'selfie_with_doc',           1, NULL,          8),
  (3, 'proof_address_utility',     0, 'proof_address', 9),
  (3, 'proof_address_bank',        0, 'proof_address', 10),
  (3, 'proof_address_rent',        0, 'proof_address', 11),
  (3, 'proof_address_tax',         0, 'proof_address', 12);

-- ── 5. CONDITIONS KYC PAR RANG ──────────────────────────────
-- Tout désactivé par défaut — admin peut activer rang par rang
CREATE TABLE IF NOT EXISTS kyc_rank_conditions (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  rank_name     TEXT NOT NULL UNIQUE,   -- Doit correspondre aux rangs MLM
  kyc_level_required INTEGER DEFAULT 0, -- Niveau KYC minimum requis
  is_active     INTEGER DEFAULT 0,      -- 0 = pas de condition (défaut)
  created_at    TEXT DEFAULT (datetime('now')),
  updated_at    TEXT DEFAULT (datetime('now'))
);

-- Pré-remplir avec tous les rangs MLM existants (tous désactivés)
INSERT OR IGNORE INTO kyc_rank_conditions (rank_name, kyc_level_required, is_active) VALUES
  ('none',        0, 0),
  ('etoile',      0, 0),
  ('senior',      0, 0),
  ('manager',     0, 0),
  ('directeur',   0, 0),
  ('ambassadeur', 0, 0),
  ('president',   0, 0),
  ('fondateur',   0, 0);

-- ── 6. MOTIFS DE REJET ──────────────────────────────────────
-- Modifiables depuis l'admin (ajouter, modifier, désactiver)
CREATE TABLE IF NOT EXISTS kyc_rejection_reasons (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  code        TEXT NOT NULL UNIQUE,
  label       TEXT NOT NULL,        -- Affiché à l'admin
  member_msg  TEXT NOT NULL,        -- Message envoyé au membre
  category    TEXT DEFAULT 'document', -- 'document' | 'identity' | 'fraud' | 'other'
  is_active   INTEGER DEFAULT 1,
  sort_order  INTEGER DEFAULT 0,
  created_at  TEXT DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO kyc_rejection_reasons (code, label, member_msg, category, sort_order) VALUES
  ('doc_blurry',        'Document flou ou illisible',          'Votre document est flou ou illisible. Veuillez soumettre une photo nette.',                                       'document', 1),
  ('doc_expired',       'Document expiré',                     'Votre document est expiré. Veuillez soumettre un document en cours de validité.',                                  'document', 2),
  ('doc_cut_off',       'Document incomplet / coupé',          'Votre document est partiellement visible. Assurez-vous que les 4 coins apparaissent.',                            'document', 3),
  ('doc_wrong_type',    'Mauvais type de document',            'Le document soumis ne correspond pas au type demandé.',                                                            'document', 4),
  ('doc_not_accepted',  'Document non accepté',                'Ce type de document n''est pas accepté. Veuillez consulter la liste des documents valides.',                      'document', 5),
  ('selfie_poor',       'Selfie de mauvaise qualité',          'Votre selfie est de mauvaise qualité. Assurez-vous d''être bien éclairé et de face.',                            'document', 6),
  ('selfie_mismatch',   'Selfie ne correspond pas au document','Le visage sur le selfie ne correspond pas à la photo du document d''identité.',                                   'identity', 7),
  ('name_mismatch',     'Nom ne correspond pas',               'Le nom sur votre document ne correspond pas au nom de votre profil.',                                             'identity', 8),
  ('dob_mismatch',      'Date de naissance incorrecte',        'La date de naissance sur votre document ne correspond pas à votre profil.',                                       'identity', 9),
  ('address_outdated',  'Justificatif de domicile trop ancien','Votre justificatif de domicile date de plus de 3 mois. Veuillez en fournir un plus récent.',                     'document', 10),
  ('address_mismatch',  'Adresse ne correspond pas',           'L''adresse sur le justificatif ne correspond pas à l''adresse de votre profil.',                                  'identity', 11),
  ('duplicate_doc',     'Document déjà utilisé',               'Ce document a déjà été utilisé pour un autre compte. Contactez le support.',                                      'fraud',    12),
  ('suspected_fraud',   'Suspicion de fraude',                 'Votre dossier nécessite une vérification supplémentaire. Notre équipe vous contactera.',                          'fraud',    13),
  ('photo_not_real',    'Photo non authentique détectée',      'La photo soumise semble ne pas être originale. Prenez une photo directement avec votre appareil.',                'fraud',    14),
  ('incomplete_file',   'Dossier incomplet',                   'Votre dossier est incomplet. Veuillez soumettre tous les documents requis.',                                       'other',    15),
  ('other',             'Autre motif (voir commentaire)',       'Votre dossier a été rejeté. Veuillez consulter le commentaire de notre équipe pour plus de détails.',             'other',    16);

-- ── 7. DOSSIERS KYC ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS kyc_applications (
  id                TEXT PRIMARY KEY,
  member_id         TEXT NOT NULL REFERENCES members(id),
  level_requested   INTEGER NOT NULL REFERENCES kyc_levels(id),
  status            TEXT NOT NULL DEFAULT 'draft',
    -- draft | submitted | in_review | approved | rejected | expired | cancelled
  assigned_admin_id TEXT DEFAULT NULL REFERENCES admin_users(id),
  submitted_at      TEXT DEFAULT NULL,
  reviewed_at       TEXT DEFAULT NULL,
  approved_at       TEXT DEFAULT NULL,
  expires_at        TEXT DEFAULT NULL,    -- Calculé à l'approbation
  rejection_reason_code TEXT DEFAULT NULL REFERENCES kyc_rejection_reasons(code),
  rejection_custom_msg  TEXT DEFAULT NULL,  -- Message personnalisé optionnel
  admin_notes       TEXT DEFAULT NULL,    -- Notes internes (non visibles du membre)
  review_duration_s INTEGER DEFAULT NULL, -- Durée de traitement en secondes
  attempt_number    INTEGER DEFAULT 1,    -- Numéro de tentative pour ce niveau
  auto_flags        TEXT DEFAULT '[]',    -- JSON array des flags auto-détectés
  created_at        TEXT DEFAULT (datetime('now')),
  updated_at        TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_kyc_app_member    ON kyc_applications(member_id);
CREATE INDEX IF NOT EXISTS idx_kyc_app_status    ON kyc_applications(status);
CREATE INDEX IF NOT EXISTS idx_kyc_app_level     ON kyc_applications(level_requested);
CREATE INDEX IF NOT EXISTS idx_kyc_app_submitted ON kyc_applications(submitted_at);
CREATE INDEX IF NOT EXISTS idx_kyc_app_assigned  ON kyc_applications(assigned_admin_id);

-- ── 8. DOCUMENTS SOUMIS ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS kyc_documents (
  id              TEXT PRIMARY KEY,
  application_id  TEXT NOT NULL REFERENCES kyc_applications(id),
  member_id       TEXT NOT NULL REFERENCES members(id),
  doc_type_id     TEXT NOT NULL REFERENCES kyc_doc_types(id),
  file_name       TEXT NOT NULL,
  file_size       INTEGER NOT NULL,    -- En octets
  mime_type       TEXT NOT NULL,
  data_b64        TEXT NOT NULL,       -- Fichier encodé base64 (stocké en D1)
  status          TEXT DEFAULT 'pending',
    -- pending | accepted | rejected
  rejection_reason_code TEXT DEFAULT NULL,
  rejection_note  TEXT DEFAULT NULL,
  ocr_data        TEXT DEFAULT '{}',   -- JSON : données extraites manuellement par admin
  checksum        TEXT DEFAULT NULL,   -- SHA256 pour détection doublons
  uploaded_at     TEXT DEFAULT (datetime('now')),
  reviewed_at     TEXT DEFAULT NULL,
  reviewed_by     TEXT DEFAULT NULL REFERENCES admin_users(id)
);

CREATE INDEX IF NOT EXISTS idx_kyc_doc_application ON kyc_documents(application_id);
CREATE INDEX IF NOT EXISTS idx_kyc_doc_member      ON kyc_documents(member_id);
CREATE INDEX IF NOT EXISTS idx_kyc_doc_type        ON kyc_documents(doc_type_id);
CREATE INDEX IF NOT EXISTS idx_kyc_doc_checksum    ON kyc_documents(checksum);
CREATE INDEX IF NOT EXISTS idx_kyc_doc_status      ON kyc_documents(status);

-- ── 9. FLAGS / ALERTES AUTOMATIQUES ─────────────────────────
CREATE TABLE IF NOT EXISTS kyc_flags (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  application_id  TEXT NOT NULL REFERENCES kyc_applications(id),
  member_id       TEXT NOT NULL REFERENCES members(id),
  flag_type       TEXT NOT NULL,
    -- 'name_mismatch' | 'doc_expired' | 'duplicate_doc' | 'selfie_mismatch' | 'address_mismatch' | 'manual'
  severity        TEXT DEFAULT 'medium',
    -- 'low' | 'medium' | 'high' | 'critical'
  description     TEXT NOT NULL,
  auto_detected   INTEGER DEFAULT 1,   -- 1=auto, 0=manuel admin
  resolved        INTEGER DEFAULT 0,
  resolved_by     TEXT DEFAULT NULL REFERENCES admin_users(id),
  resolved_at     TEXT DEFAULT NULL,
  resolved_note   TEXT DEFAULT NULL,
  created_at      TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_kyc_flags_application ON kyc_flags(application_id);
CREATE INDEX IF NOT EXISTS idx_kyc_flags_member      ON kyc_flags(member_id);
CREATE INDEX IF NOT EXISTS idx_kyc_flags_resolved    ON kyc_flags(resolved);

-- ── 10. JOURNAL D'AUDIT KYC ─────────────────────────────────
CREATE TABLE IF NOT EXISTS kyc_audit_log (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  application_id  TEXT NOT NULL REFERENCES kyc_applications(id),
  member_id       TEXT NOT NULL REFERENCES members(id),
  admin_id        TEXT DEFAULT NULL REFERENCES admin_users(id),
  action          TEXT NOT NULL,
    -- 'created' | 'submitted' | 'assigned' | 'approved' | 'rejected'
    -- | 'doc_accepted' | 'doc_rejected' | 'flag_added' | 'flag_resolved'
    -- | 'commented' | 'resubmit_requested' | 'expired' | 'cancelled'
  details         TEXT DEFAULT '{}',   -- JSON avec contexte de l'action
  ip_address      TEXT DEFAULT NULL,
  created_at      TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_kyc_audit_application ON kyc_audit_log(application_id);
CREATE INDEX IF NOT EXISTS idx_kyc_audit_member      ON kyc_audit_log(member_id);
CREATE INDEX IF NOT EXISTS idx_kyc_audit_admin       ON kyc_audit_log(admin_id);

-- ── 11. COLONNE KYC_LEVEL SUR MEMBERS ───────────────────────
-- Niveau KYC actuel approuvé du membre (dénormalisé pour performance)
ALTER TABLE members ADD COLUMN kyc_level INTEGER DEFAULT 0;
ALTER TABLE members ADD COLUMN kyc_level_expires_at TEXT DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_members_kyc_level ON members(kyc_level);
