-- Migration 0022 : Corrections Valorisation Recommandation + Fast Start Bonus
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Colonne reference_order_id sur commissions
--    Permet l'idempotence par orderId (une seule VR par commande, pas par filleul)
ALTER TABLE commissions ADD COLUMN reference_order_id TEXT;

-- Index pour les lookups d'idempotence VR
CREATE INDEX IF NOT EXISTS idx_commissions_vr_order
  ON commissions(type, source_member_id, reference_order_id)
  WHERE type = 'valorisation_recommandation';

-- 2. Clé recommendation_eligible_statuses dans compensation_config
--    Permet à l'admin de configurer les statuts qualifiants sans déploiement
INSERT OR IGNORE INTO compensation_config (id, key, value, description)
VALUES (
  'cc-vr-statuses',
  'recommendation_eligible_statuses',
  'Partenaire,AMI',
  'Statuts membre qualifiants pour recevoir la Valorisation Recommandation (séparés par virgule)'
);

-- 3. Fast Start : corriger fast_start_start_date = created_at pour tous les membres
--    qui ont déjà un fast_start_start_date initialisé à tort (datetime now du 1er filleul)
--    → On remet à NULL pour forcer la réinitialisation propre au prochain achat,
--      SAUF pour ceux qui ont déjà fast_start_completed = 1 (bonus versé ou expiré).
--    Note : initFastStart est maintenant appelé à l'inscription (src/routes/members.ts)
--           et utilise created_at. Cette mise à NULL est une précaution de nettoyage.
UPDATE members
SET fast_start_start_date = created_at
WHERE fast_start_completed = 0
  AND fast_start_start_date IS NOT NULL;
