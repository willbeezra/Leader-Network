-- ============================================================
-- Migration 0089 — Index de scalabilité supplémentaires
-- Cible : 10 000+ membres simultanés
-- Complète la migration 0088 avec les tables restantes
-- ============================================================

-- ── wallet_transactions : colonnes les plus fréquentes ─────────────────────
-- Requêtes : WHERE member_id=? AND wallet_type=?  (wallet-history principal/pending)
CREATE INDEX IF NOT EXISTS idx_wt_member_wallet_type
  ON wallet_transactions(member_id, wallet_type);

-- Requêtes : WHERE member_id=? ORDER BY created_at DESC LIMIT ?
-- (déjà couvert par idx_wt_member_created de 0088, on ajoute le filtre wallet_type)
CREATE INDEX IF NOT EXISTS idx_wt_member_type_created
  ON wallet_transactions(member_id, wallet_type, created_at DESC);

-- Requêtes : WHERE reference_id = ?  (jointures dans /transactions)
CREATE INDEX IF NOT EXISTS idx_wt_reference_id
  ON wallet_transactions(reference_id);

-- ── cc_transactions : journal Crédit de Croissance ─────────────────────────
CREATE INDEX IF NOT EXISTS idx_cc_tx_member_created
  ON cc_transactions(member_id, created_at DESC);

-- ── credit_croissance : WHERE member_id=? AND status IN (...) ──────────────
CREATE INDEX IF NOT EXISTS idx_credit_croissance_member_status
  ON credit_croissance(member_id, status);

-- ── reserve_strategique ─────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_rs_member_status
  ON reserve_strategique(member_id, status);

CREATE INDEX IF NOT EXISTS idx_rs_member_created
  ON reserve_strategique(member_id, created_at DESC);

-- ── cc_withdrawals ──────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_cc_wd_member_status
  ON cc_withdrawals(member_id, status);

-- ── dreamiles_transactions ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_dreamiles_tx_member
  ON dreamiles_transactions(member_id, created_at DESC);

-- ── pending_wallet_entries : filtre composite le plus fréquent ─────────────
-- Requête : WHERE member_id=? AND status IN ('pending_release','active')
-- (idx_pwe_member_status de 0088 couvre déjà member_id + status)
-- Ajouter tri par eligible_date pour ORDER BY eligible_date ASC
CREATE INDEX IF NOT EXISTS idx_pwe_member_status_eligible
  ON pending_wallet_entries(member_id, status, eligible_date ASC);

-- ── holding_tank ────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_ht_member_status
  ON holding_tank(member_id, status);

CREATE INDEX IF NOT EXISTS idx_ht_status
  ON holding_tank(status);

-- ── package_orders : filtre status validé + date ───────────────────────────
-- Couvre WHERE member_id=? AND status='validated' ORDER BY validated_at DESC
CREATE INDEX IF NOT EXISTS idx_po_member_validated_at
  ON package_orders(member_id, validated_at DESC);

-- ── members : recherche admin (LIKE sur nom/email) ──────────────────────────
-- SQLite ne supporte pas les index fonctionnels (LOWER) mais on peut couvrir
-- les colonnes fréquemment utilisées dans les recherches
CREATE INDEX IF NOT EXISTS idx_members_sponsor_status
  ON members(sponsor_id, member_status);

CREATE INDEX IF NOT EXISTS idx_members_status_license
  ON members(member_status, license_active);

CREATE INDEX IF NOT EXISTS idx_members_in_holding_tank
  ON members(in_holding_tank);

-- ── commissions : filtres additionnels ─────────────────────────────────────
-- WHERE member_id=? AND type=? (filtre par type de commission)
CREATE INDEX IF NOT EXISTS idx_commissions_member_type
  ON commissions(member_id, type);

-- WHERE member_id=? AND period=?
CREATE INDEX IF NOT EXISTS idx_commissions_member_period
  ON commissions(member_id, period);

-- WHERE source_member_id=? (propagation BV, jointures)
CREATE INDEX IF NOT EXISTS idx_commissions_source_member
  ON commissions(source_member_id);

-- ── withdrawals : filtres additionnels ─────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_withdrawals_status
  ON withdrawals(status);

CREATE INDEX IF NOT EXISTS idx_withdrawals_member_status
  ON withdrawals(member_id, status);

-- ── admin_audit_log : requêtes admin (table admin_audit_log) ────────────────
CREATE INDEX IF NOT EXISTS idx_admin_audit_member_created
  ON admin_audit_log(member_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_audit_action_created
  ON admin_audit_log(action, created_at DESC);

-- ── bv_logs : filtres fréquents ─────────────────────────────────────────────
-- WHERE member_id=? AND bv_type != 'fast_start_contribution'
CREATE INDEX IF NOT EXISTS idx_bv_logs_member_type
  ON bv_logs(member_id, bv_type);

-- ── wallet_transfers : jointures ────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_wt_transfers_sender
  ON wallet_transfers(sender_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_wt_transfers_recipient
  ON wallet_transfers(recipient_id, created_at DESC);
