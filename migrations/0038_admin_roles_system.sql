-- ============================================================
-- Migration 0038 — Système de rôles admin entièrement paramétrable
-- ============================================================

-- 1. Table des rôles
CREATE TABLE IF NOT EXISTS admin_roles (
  id         TEXT PRIMARY KEY,
  label      TEXT NOT NULL,
  color      TEXT NOT NULL DEFAULT '#6b7280',
  icon       TEXT NOT NULL DEFAULT 'fa-user',
  is_system  INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Table des permissions par rôle
CREATE TABLE IF NOT EXISTS admin_role_permissions (
  role_id    TEXT NOT NULL,
  permission TEXT NOT NULL,
  PRIMARY KEY (role_id, permission),
  FOREIGN KEY (role_id) REFERENCES admin_roles(id) ON DELETE CASCADE
);

-- 3. Table de liaison admin ↔ rôles (multi-rôles par admin)
CREATE TABLE IF NOT EXISTS admin_user_roles (
  admin_user_id TEXT NOT NULL,
  role_id       TEXT NOT NULL,
  assigned_by   TEXT,
  assigned_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (admin_user_id, role_id),
  FOREIGN KEY (admin_user_id) REFERENCES admin_users(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id)       REFERENCES admin_roles(id) ON DELETE CASCADE
);

-- ============================================================
-- 4. Rôles de départ
-- ============================================================

INSERT OR IGNORE INTO admin_roles (id, label, color, icon, is_system) VALUES
  ('super_admin', 'Super Admin',   '#ef4444', 'fa-crown',         1),
  ('admin',       'Administrateur','#8b5cf6', 'fa-shield-halved', 0),
  ('support',     'Support',       '#3b82f6', 'fa-headset',       0),
  ('accountant',  'Comptable',     '#f59e0b', 'fa-calculator',    0);

-- ============================================================
-- 5. Permissions — Super Admin (toutes)
-- ============================================================

INSERT OR IGNORE INTO admin_role_permissions (role_id, permission) VALUES
  ('super_admin','members.view'),
  ('super_admin','members.edit'),
  ('super_admin','members.delete'),
  ('super_admin','members.impersonate'),
  ('super_admin','wallets.view'),
  ('super_admin','wallets.edit'),
  ('super_admin','withdrawals.view'),
  ('super_admin','withdrawals.approve'),
  ('super_admin','commissions.view'),
  ('super_admin','commissions.edit'),
  ('super_admin','packages.view'),
  ('super_admin','packages.edit'),
  ('super_admin','tree.view'),
  ('super_admin','tree.edit'),
  ('super_admin','support.view'),
  ('super_admin','support.reply'),
  ('super_admin','support.assign'),
  ('super_admin','support.close'),
  ('super_admin','support.delete'),
  ('super_admin','settings.view'),
  ('super_admin','settings.edit'),
  ('super_admin','admin_users.view'),
  ('super_admin','admin_users.create'),
  ('super_admin','admin_users.edit'),
  ('super_admin','admin_users.delete'),
  ('super_admin','roles.view'),
  ('super_admin','roles.edit');

-- ============================================================
-- 6. Permissions — Administrateur (tout sauf suppression admin et roles.edit)
-- ============================================================

INSERT OR IGNORE INTO admin_role_permissions (role_id, permission) VALUES
  ('admin','members.view'),
  ('admin','members.edit'),
  ('admin','members.delete'),
  ('admin','members.impersonate'),
  ('admin','wallets.view'),
  ('admin','wallets.edit'),
  ('admin','withdrawals.view'),
  ('admin','withdrawals.approve'),
  ('admin','commissions.view'),
  ('admin','commissions.edit'),
  ('admin','packages.view'),
  ('admin','packages.edit'),
  ('admin','tree.view'),
  ('admin','tree.edit'),
  ('admin','support.view'),
  ('admin','support.reply'),
  ('admin','support.assign'),
  ('admin','support.close'),
  ('admin','support.delete'),
  ('admin','settings.view'),
  ('admin','settings.edit'),
  ('admin','admin_users.view'),
  ('admin','admin_users.create'),
  ('admin','admin_users.edit'),
  ('admin','roles.view');

-- ============================================================
-- 7. Permissions — Support
-- ============================================================

INSERT OR IGNORE INTO admin_role_permissions (role_id, permission) VALUES
  ('support','members.view'),
  ('support','wallets.view'),
  ('support','withdrawals.view'),
  ('support','commissions.view'),
  ('support','packages.view'),
  ('support','tree.view'),
  ('support','support.view'),
  ('support','support.reply'),
  ('support','support.assign'),
  ('support','support.close');

-- ============================================================
-- 8. Permissions — Comptable
-- ============================================================

INSERT OR IGNORE INTO admin_role_permissions (role_id, permission) VALUES
  ('accountant','members.view'),
  ('accountant','wallets.view'),
  ('accountant','wallets.edit'),
  ('accountant','withdrawals.view'),
  ('accountant','withdrawals.approve'),
  ('accountant','commissions.view'),
  ('accountant','commissions.edit'),
  ('accountant','packages.view'),
  ('accountant','tree.view');

-- ============================================================
-- 9. Attribuer super_admin à ceo@willbenetwork.com
-- ============================================================

INSERT OR IGNORE INTO admin_user_roles (admin_user_id, role_id, assigned_by)
  SELECT id, 'super_admin', id
  FROM admin_users
  WHERE email = 'ceo@willbenetwork.com';
