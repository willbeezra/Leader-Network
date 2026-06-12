-- ═══════════════════════════════════════════════════════════════
-- Migration 0039 — Index SQL pour le système de rapports
-- Optimise toutes les requêtes analytiques (GROUP BY, WHERE, ORDER BY)
-- ═══════════════════════════════════════════════════════════════

-- ── COMMISSIONS (table la plus interrogée dans les rapports) ──
CREATE INDEX IF NOT EXISTS idx_commissions_period     ON commissions(period);
CREATE INDEX IF NOT EXISTS idx_commissions_type       ON commissions(type);
CREATE INDEX IF NOT EXISTS idx_commissions_status     ON commissions(status);
CREATE INDEX IF NOT EXISTS idx_commissions_created    ON commissions(created_at);
CREATE INDEX IF NOT EXISTS idx_commissions_member_period ON commissions(member_id, period);
CREATE INDEX IF NOT EXISTS idx_commissions_type_status   ON commissions(type, status);

-- ── BV_LOGS ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_bv_logs_period         ON bv_logs(period);
CREATE INDEX IF NOT EXISTS idx_bv_logs_bv_type        ON bv_logs(bv_type);
CREATE INDEX IF NOT EXISTS idx_bv_logs_created        ON bv_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_bv_logs_member_period  ON bv_logs(member_id, period);
CREATE INDEX IF NOT EXISTS idx_bv_logs_propagated     ON bv_logs(propagated);

-- ── PACKAGE_ORDERS ────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_po_status              ON package_orders(status);
CREATE INDEX IF NOT EXISTS idx_po_created             ON package_orders(created_at);
CREATE INDEX IF NOT EXISTS idx_po_payment_method      ON package_orders(payment_method);
CREATE INDEX IF NOT EXISTS idx_po_member_status       ON package_orders(member_id, status);

-- ── WITHDRAWALS ───────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_wd_status              ON withdrawals(status);
CREATE INDEX IF NOT EXISTS idx_wd_created             ON withdrawals(created_at);
CREATE INDEX IF NOT EXISTS idx_wd_member_status       ON withdrawals(member_id, status);

-- ── MEMBERS ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_members_status         ON members(member_status);
CREATE INDEX IF NOT EXISTS idx_members_rank           ON members(current_rank);
CREATE INDEX IF NOT EXISTS idx_members_country        ON members(country);
CREATE INDEX IF NOT EXISTS idx_members_created        ON members(created_at);
CREATE INDEX IF NOT EXISTS idx_members_license        ON members(license_active);
CREATE INDEX IF NOT EXISTS idx_members_kyc            ON members(kyc_status);
CREATE INDEX IF NOT EXISTS idx_members_sponsor        ON members(sponsor_id);
CREATE INDEX IF NOT EXISTS idx_members_fast_start     ON members(fast_start_completed);

-- ── FINSTRATEGIA_LICENSES ─────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_lic_status             ON finstrategia_licenses(status);
CREATE INDEX IF NOT EXISTS idx_lic_created            ON finstrategia_licenses(created_at);
CREATE INDEX IF NOT EXISTS idx_lic_expires            ON finstrategia_licenses(expires_at);
CREATE INDEX IF NOT EXISTS idx_lic_member             ON finstrategia_licenses(member_id);

-- ── WALLET_TRANSACTIONS ───────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_wt_transaction_type    ON wallet_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_wt_wallet_type         ON wallet_transactions(wallet_type);
CREATE INDEX IF NOT EXISTS idx_wt_created             ON wallet_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_wt_member_wtype        ON wallet_transactions(member_id, wallet_type);

-- ── SUPPORT_TICKETS ───────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_st_status              ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_st_category            ON support_tickets(category);
CREATE INDEX IF NOT EXISTS idx_st_priority            ON support_tickets(priority);
CREATE INDEX IF NOT EXISTS idx_st_created             ON support_tickets(created_at);
CREATE INDEX IF NOT EXISTS idx_st_assigned            ON support_tickets(assigned_to);

-- ── ADMIN_AUDIT_LOG ───────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_audit_action           ON admin_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_created_asc      ON admin_audit_log(created_at);

-- ── CC_TRANSACTIONS ───────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_cct_type               ON cc_transactions(type);
CREATE INDEX IF NOT EXISTS idx_cct_period             ON cc_transactions(period);
CREATE INDEX IF NOT EXISTS idx_cct_ref_type           ON cc_transactions(reference_type);

-- ── CC_WITHDRAWALS ────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_ccw_status             ON cc_withdrawals(status);
CREATE INDEX IF NOT EXISTS idx_ccw_created            ON cc_withdrawals(created_at);

-- ── DREAMILES_TRANSACTIONS ────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_dmt_type               ON dreamiles_transactions(type);
CREATE INDEX IF NOT EXISTS idx_dmt_created            ON dreamiles_transactions(created_at);

-- ── MONTHLY_VALIDATIONS ───────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_mv_period              ON monthly_validations(period);

-- ── HOLDING_TANK ──────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_ht_status              ON holding_tank(status);
