-- ============================================================
-- LEADER Network — Migration 0090
-- RESET COMPLET : suppression de toutes les données de test
-- Garde : structure des tables, config, packages, rangs
-- Recrée : membre ROOT + compte admin super_admin
-- ============================================================

PRAGMA foreign_keys = OFF;

-- ── 1. QUEUES & LOGS ─────────────────────────────────────────
DELETE FROM commission_queue;
DELETE FROM bv_queue;
DELETE FROM rank_queue;
DELETE FROM admin_audit_log;
DELETE FROM ai_agent_logs;
DELETE FROM email_logs;

-- ── 2. TRANSACTIONS FINANCIÈRES ──────────────────────────────
DELETE FROM commissions;
DELETE FROM bv_logs;
DELETE FROM pending_wallet_entries;
DELETE FROM wallet_transactions;
DELETE FROM wallet_topups;
DELETE FROM wallet_transfers;
DELETE FROM dreamiles_transactions;
DELETE FROM cc_transactions;
DELETE FROM cc_withdrawals;
DELETE FROM reserve_strategique;
DELETE FROM credit_croissance;
DELETE FROM withdrawals;
DELETE FROM payment_rollbacks;
DELETE FROM proof_ai_reviews;

-- ── 3. ACHATS & LICENCES ─────────────────────────────────────
DELETE FROM checkout_orders;
DELETE FROM package_orders;
DELETE FROM finstrategia_licenses;
DELETE FROM subscription_renewals;
DELETE FROM physical_card_orders;
DELETE FROM member_cards;

-- ── 4. KYC & SUPPORT ─────────────────────────────────────────
DELETE FROM kyc_applications;
DELETE FROM kyc_documents;
DELETE FROM kyc_flags;
DELETE FROM kyc_audit_log;
DELETE FROM support_messages;
DELETE FROM support_tickets;

-- ── 5. CAMPUS ────────────────────────────────────────────────
DELETE FROM campus_course_orders;
DELETE FROM campus_enrollments;
DELETE FROM campus_progress;

-- ── 6. DIVERS MEMBRES ────────────────────────────────────────
DELETE FROM broker_registrations;
DELETE FROM holding_tank;
DELETE FROM monthly_validations;
DELETE FROM member_saved_payments;
DELETE FROM member_overrides;
DELETE FROM member_overrides_log;
DELETE FROM notifications;
DELETE FROM uploaded_files;
DELETE FROM dreamiles_wallet;

-- ── 7. WALLETS ───────────────────────────────────────────────
DELETE FROM wallets;

-- ── 8. MEMBRES (tous) ────────────────────────────────────────
DELETE FROM members;

-- ── 9. COMPTES ADMIN (tous) ──────────────────────────────────
DELETE FROM admin_user_roles;
DELETE FROM admin_users;

-- ── 10. RECRÉE LE MEMBRE ROOT ────────────────────────────────
INSERT INTO members (
  id, unique_id, email, password_hash, pin_hash,
  first_name, last_name,
  member_status, current_rank,
  license_active, license_expires_at,
  kyc_status, in_holding_tank,
  binary_parent_id, binary_position,
  binary_left_id, binary_right_id,
  wallet_balance, credit_croissance, reserve_strategique,
  registration_method,
  created_at, updated_at
) VALUES (
  'root-system-000000000000000000000000',
  'ROOT',
  'root@leader-network.system',
  'not-a-real-hash',
  'not-a-real-pin',
  'ROOT', 'System',
  'AMI', 'none',
  1, NULL,
  'verified', 0,
  NULL, NULL, NULL, NULL,
  0, 0, 0,
  'admin',
  datetime('now'), datetime('now')
);

-- Wallet du ROOT (obligatoire pour les JOIN)
INSERT INTO wallets (id, member_id, balance, total_earned, total_withdrawn)
VALUES ('wallet-root-000000000000000000000', 'root-system-000000000000000000000000', 0, 0, 0);

-- ── 11. RECRÉE LE COMPTE SUPER ADMIN ─────────────────────────
-- Email : admin@willbeleader.com
-- Mot de passe : WillBeLeader2026!
INSERT INTO admin_users (id, email, password_hash, name, role)
VALUES (
  'admin-reset-000000000000000000000001',
  'admin@willbeleader.com',
  '365fe771-8b89-46a4-a3fc-0f2890660242:eb55cb4f4e7b7e98d740c38bc8f32eecda40bf074f11705da22593c3b11e5d1c',
  'Super Admin',
  'super_admin'
);

INSERT OR IGNORE INTO admin_user_roles (admin_user_id, role_id)
VALUES ('admin-reset-000000000000000000000001', 'super_admin');

PRAGMA foreign_keys = ON;
