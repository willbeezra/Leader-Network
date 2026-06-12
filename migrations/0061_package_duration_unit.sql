-- Migration 0061 : Durée de vie package avec unité configurable (jours/mois/années)
-- Remplace duration_years par duration_value + duration_unit

-- 1. Colonne valeur numérique (NULL = illimité / défaut global)
ALTER TABLE packages ADD COLUMN duration_value INTEGER DEFAULT NULL;

-- 2. Colonne unité : 'days' | 'months' | 'years' (défaut 'years' pour compat)
ALTER TABLE packages ADD COLUMN duration_unit TEXT DEFAULT 'years';

-- 3. Migrer les données existantes de duration_years vers duration_value
UPDATE packages
SET duration_value = duration_years,
    duration_unit  = 'years'
WHERE duration_years IS NOT NULL;

-- 4. Liveness check config (dans kyc_config)
INSERT OR IGNORE INTO kyc_config (key, value, label, description, type) VALUES
  ('kyc_liveness_enabled',      '0',           'Vérification liveness activée',     'Activer la vérification faciale dynamique (mouvements de tête) lors du KYC', 'boolean'),
  ('kyc_liveness_steps',        'blink,turn_left,turn_right', 'Étapes liveness',    'Étapes de vérification : blink, turn_left, turn_right, nod, smile (séparées par virgules)', 'text'),
  ('kyc_liveness_required_at',  'kyc_only',    'Liveness requis lors de',           'kyc_only = KYC uniquement | payment = paiement uniquement | both = les deux', 'text');
