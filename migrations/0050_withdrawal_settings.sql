-- ── Migration 0050 — Paramètres de retrait entièrement configurables ─────────
-- Tous les paramètres retrait passent dans compensation_config
-- Plus rien de hardcodé dans le code source
-- ─────────────────────────────────────────────────────────────────────────────

-- Jours autorisés (séparés par virgule, 0=dim,1=lun,2=mar,3=mer,4=jeu,5=ven,6=sam)
INSERT OR IGNORE INTO compensation_config (id, key, value, description) VALUES
  (lower(hex(randomblob(16))), 'withdrawal_allowed_days',  '3',       'Jours autorisés pour les retraits (0=Dim,1=Lun,2=Mar,3=Mer,4=Jeu,5=Ven,6=Sam) — séparés par virgule');

-- Activer / désactiver les retraits globalement
INSERT OR IGNORE INTO compensation_config (id, key, value, description) VALUES
  (lower(hex(randomblob(16))), 'withdrawal_enabled',       '1',       'Retraits activés (1=oui, 0=non)');

-- Message affiché quand les retraits sont désactivés
INSERT OR IGNORE INTO compensation_config (id, key, value, description) VALUES
  (lower(hex(randomblob(16))), 'withdrawal_disabled_msg',  'Les retraits sont temporairement suspendus. Veuillez réessayer ultérieurement.', 'Message affiché aux membres quand withdrawal_enabled=0');

-- Frais de retrait en pourcentage (0 = sans frais)
INSERT OR IGNORE INTO compensation_config (id, key, value, description) VALUES
  (lower(hex(randomblob(16))), 'withdrawal_fee_pct',       '0',       'Frais de retrait en % (0 = gratuit)');

-- Frais fixes en dollars (en plus du % ou seuls si fee_pct=0)
INSERT OR IGNORE INTO compensation_config (id, key, value, description) VALUES
  (lower(hex(randomblob(16))), 'withdrawal_fee_fixed',     '0',       'Frais fixes de retrait en $ (cumulable avec withdrawal_fee_pct)');

-- Montant maximum par demande (0 = illimité, surclassé par plafonds KYC)
INSERT OR IGNORE INTO compensation_config (id, key, value, description) VALUES
  (lower(hex(randomblob(16))), 'withdrawal_max_amount',    '0',       'Montant maximum par demande en $ (0 = illimite, plafonds KYC appliques en plus)');

-- Nombre maximum de retraits par mois et par membre (0 = illimité)
INSERT OR IGNORE INTO compensation_config (id, key, value, description) VALUES
  (lower(hex(randomblob(16))), 'withdrawal_max_per_month', '0',       'Nombre maximum de retraits par mois par membre (0 = illimité)');

-- Délai de traitement affiché au membre (texte libre)
INSERT OR IGNORE INTO compensation_config (id, key, value, description) VALUES
  (lower(hex(randomblob(16))), 'withdrawal_processing_time', '24-48h', 'Délai de traitement affiché au membre (texte libre, ex: 24-48h)');

-- KYC minimum requis pour retirer (niveau 0 = pas de KYC obligatoire)
INSERT OR IGNORE INTO compensation_config (id, key, value, description) VALUES
  (lower(hex(randomblob(16))), 'withdrawal_kyc_min_level', '1',       'Niveau KYC minimum requis pour retirer (0=aucun, 1=niveau 1, etc.)');
