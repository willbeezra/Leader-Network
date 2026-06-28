-- Migration 0088 : Index de performance pour passage à l'échelle (10 000+ membres)
-- Tous les CREATE INDEX utilisent IF NOT EXISTS → migration idempotente et sans risque

-- ── notifications ────────────────────────────────────────────────────────────
-- Le dashboard fait : SELECT COUNT(*) WHERE member_id = ? AND is_read = 0
-- L'index composite (member_id, is_read) couvre cette requête entièrement
CREATE INDEX IF NOT EXISTS idx_notifications_member_read
  ON notifications(member_id, is_read);

-- Tri par date pour l'affichage de la liste
CREATE INDEX IF NOT EXISTS idx_notifications_member_created
  ON notifications(member_id, created_at DESC);

-- ── pending_wallet_entries ───────────────────────────────────────────────────
-- Le dashboard fait : WHERE member_id = ? AND status IN ('pending_release','active')
CREATE INDEX IF NOT EXISTS idx_pwe_member_status
  ON pending_wallet_entries(member_id, status);

-- ── members ──────────────────────────────────────────────────────────────────
-- Login : WHERE email = ? (utilisé à chaque connexion)
CREATE INDEX IF NOT EXISTS idx_members_email
  ON members(email);

-- Recherche admin par nom/prénom
CREATE INDEX IF NOT EXISTS idx_members_firstname
  ON members(first_name);

CREATE INDEX IF NOT EXISTS idx_members_lastname
  ON members(last_name);

-- ── commissions ──────────────────────────────────────────────────────────────
-- Dashboard recent : WHERE member_id = ? ORDER BY created_at DESC LIMIT 8
CREATE INDEX IF NOT EXISTS idx_commissions_member_created
  ON commissions(member_id, created_at DESC);

-- ── package_orders ───────────────────────────────────────────────────────────
-- Jointure fréquente : WHERE member_id = ? AND status = 'validated'
CREATE INDEX IF NOT EXISTS idx_po_member_status_validated
  ON package_orders(member_id, status);

-- activePackage dashboard : WHERE member_id = ? AND status = 'active'
CREATE INDEX IF NOT EXISTS idx_po_member_active
  ON package_orders(member_id, status, validated_at DESC);

-- ── finstrategia_licenses ────────────────────────────────────────────────────
-- /me et dashboard : WHERE member_id = ? AND status = 'active'
CREATE INDEX IF NOT EXISTS idx_lic_member_status
  ON finstrategia_licenses(member_id, status);

-- ── wallet_transactions ──────────────────────────────────────────────────────
-- Transactions récentes : WHERE member_id = ? ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_wt_member_created
  ON wallet_transactions(member_id, created_at DESC);

-- ── withdrawals ──────────────────────────────────────────────────────────────
-- Vérification limite mensuelle : WHERE member_id = ? AND created_at >= ?
CREATE INDEX IF NOT EXISTS idx_wd_member_created
  ON withdrawals(member_id, created_at);

-- ── bv_logs ──────────────────────────────────────────────────────────────────
-- Journal BV membre : WHERE member_id = ? ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_bv_logs_member_created
  ON bv_logs(member_id, created_at DESC);

-- ── bv_queue ─────────────────────────────────────────────────────────────────
-- Orchestrateur : WHERE status = 'pending' ORDER BY created_at
CREATE INDEX IF NOT EXISTS idx_bv_queue_status_created
  ON bv_queue(status, created_at);

-- ── support_tickets ──────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_support_member_status
  ON support_tickets(member_id, status);

CREATE INDEX IF NOT EXISTS idx_support_created
  ON support_tickets(created_at DESC);
