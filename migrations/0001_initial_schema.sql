-- ============================================================
-- LEADER Network — Migration 0001 : Schéma complet (24 tables)
-- ============================================================

-- 1. Members (Entité centrale)
CREATE TABLE IF NOT EXISTS members (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  unique_id TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  pin_hash TEXT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  country TEXT,
  sponsor_id TEXT REFERENCES members(id),
  binary_parent_id TEXT REFERENCES members(id),
  binary_position TEXT CHECK(binary_position IN ('L','R')),
  member_status TEXT NOT NULL DEFAULT 'Membre' CHECK(member_status IN ('Membre','Client','Partenaire','AMI')),
  current_rank TEXT NOT NULL DEFAULT 'none',
  left_bv_total REAL NOT NULL DEFAULT 0,
  right_bv_total REAL NOT NULL DEFAULT 0,
  left_bv_monthly REAL NOT NULL DEFAULT 0,
  right_bv_monthly REAL NOT NULL DEFAULT 0,
  personal_bv_monthly REAL NOT NULL DEFAULT 0,
  license_active INTEGER NOT NULL DEFAULT 0,
  license_expires_at TEXT,
  kyc_status TEXT NOT NULL DEFAULT 'not_submitted' CHECK(kyc_status IN ('not_submitted','pending','verified','rejected')),
  kyc_document_url TEXT,
  kyc_reviewed_at TEXT,
  fast_start_start_date TEXT,
  fast_start_completed INTEGER NOT NULL DEFAULT 0,
  in_holding_tank INTEGER NOT NULL DEFAULT 0,
  wallet_balance REAL NOT NULL DEFAULT 0,
  credit_croissance REAL NOT NULL DEFAULT 0,
  reserve_strategique REAL NOT NULL DEFAULT 0,
  avatar_url TEXT,
  paypal_email TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 2. Admin Users
CREATE TABLE IF NOT EXISTS admin_users (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin' CHECK(role IN ('super_admin','admin')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 3. Packages
CREATE TABLE IF NOT EXISTS packages (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  price_usd REAL NOT NULL,
  bv_value REAL NOT NULL,
  description TEXT,
  features TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 4. Package Orders
CREATE TABLE IF NOT EXISTS package_orders (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  member_id TEXT NOT NULL REFERENCES members(id),
  package_id TEXT NOT NULL REFERENCES packages(id),
  amount_usd REAL NOT NULL,
  bv_value REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','proof_submitted','validated','rejected','cancelled')),
  payment_method TEXT NOT NULL DEFAULT 'manual' CHECK(payment_method IN ('paypal','manual')),
  paypal_order_id TEXT,
  proof_url TEXT,
  validated_by TEXT REFERENCES admin_users(id),
  validated_at TEXT,
  rejection_reason TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 5. Finstrategia Licenses
CREATE TABLE IF NOT EXISTS finstrategia_licenses (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  member_id TEXT NOT NULL REFERENCES members(id),
  price_usd REAL NOT NULL DEFAULT 97,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','proof_submitted','validated','rejected','active','expired')),
  payment_method TEXT NOT NULL DEFAULT 'manual',
  paypal_order_id TEXT,
  proof_url TEXT,
  validated_by TEXT REFERENCES admin_users(id),
  validated_at TEXT,
  starts_at TEXT,
  expires_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 6. Checkout Orders (Panier combiné Package + Licence)
CREATE TABLE IF NOT EXISTS checkout_orders (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  member_id TEXT NOT NULL REFERENCES members(id),
  package_order_id TEXT REFERENCES package_orders(id),
  license_order_id TEXT REFERENCES finstrategia_licenses(id),
  total_amount REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  paypal_order_id TEXT,
  proof_url TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 7. Wallets
CREATE TABLE IF NOT EXISTS wallets (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  member_id TEXT UNIQUE NOT NULL REFERENCES members(id),
  balance REAL NOT NULL DEFAULT 0,
  total_earned REAL NOT NULL DEFAULT 0,
  total_withdrawn REAL NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 8. Commissions
CREATE TABLE IF NOT EXISTS commissions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  member_id TEXT NOT NULL REFERENCES members(id),
  type TEXT NOT NULL CHECK(type IN ('prime_leadership','bonus_influence','bonus_rayonnement','valorisation_recommandation','fast_start','credit_croissance','reserve_strategique')),
  amount REAL NOT NULL,
  description TEXT,
  period TEXT,
  source_member_id TEXT REFERENCES members(id),
  rank_at_time TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','paid','cancelled')),
  paid_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 9. Withdrawals
CREATE TABLE IF NOT EXISTS withdrawals (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  member_id TEXT NOT NULL REFERENCES members(id),
  amount REAL NOT NULL,
  fee REAL NOT NULL DEFAULT 0,
  net_amount REAL NOT NULL,
  paypal_email TEXT NOT NULL,
  pin_verified INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','processing','completed','rejected')),
  admin_note TEXT,
  confirmed_by TEXT REFERENCES admin_users(id),
  confirmed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 10. BV Logs (Source de vérité absolue)
CREATE TABLE IF NOT EXISTS bv_logs (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  member_id TEXT NOT NULL REFERENCES members(id),
  source_member_id TEXT REFERENCES members(id),
  bv_amount REAL NOT NULL,
  bv_type TEXT NOT NULL CHECK(bv_type IN ('package_purchase','license_renewal','personal')),
  package_order_id TEXT REFERENCES package_orders(id),
  propagated INTEGER NOT NULL DEFAULT 0,
  period TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 11. BV Queue (File de traitement BV)
CREATE TABLE IF NOT EXISTS bv_queue (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  member_id TEXT NOT NULL REFERENCES members(id),
  bv_amount REAL NOT NULL,
  source_order_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','processing','completed','failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  processed_at TEXT
);

-- 12. Rank Queue
CREATE TABLE IF NOT EXISTS rank_queue (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  member_id TEXT NOT NULL REFERENCES members(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','processing','completed')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  processed_at TEXT
);

-- 13. Commission Queue
CREATE TABLE IF NOT EXISTS commission_queue (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  member_id TEXT NOT NULL REFERENCES members(id),
  commission_type TEXT NOT NULL,
  amount REAL NOT NULL,
  period TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','processing','completed','failed')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  processed_at TEXT
);

-- 14. Holding Tank
CREATE TABLE IF NOT EXISTS holding_tank (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  member_id TEXT UNIQUE NOT NULL REFERENCES members(id),
  sponsor_id TEXT REFERENCES members(id),
  entry_reason TEXT,
  placed_by TEXT REFERENCES admin_users(id),
  placed_at TEXT,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK(status IN ('waiting','placed')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 15. Rank Config
CREATE TABLE IF NOT EXISTS rank_config (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  rank_name TEXT UNIQUE NOT NULL,
  rank_order INTEGER NOT NULL,
  min_bv_leg REAL NOT NULL,
  min_directs INTEGER NOT NULL DEFAULT 1,
  required_package_type TEXT NOT NULL DEFAULT 'Production',
  monthly_prime REAL NOT NULL,
  monthly_cap REAL NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 16. Compensation Config
CREATE TABLE IF NOT EXISTS compensation_config (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 17. Influence Config (Bonus d'Influence par niveau)
CREATE TABLE IF NOT EXISTS influence_config (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  level INTEGER UNIQUE NOT NULL,
  percentage REAL NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 18. Fast Start Config
CREATE TABLE IF NOT EXISTS fast_start_config (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  bv_threshold REAL NOT NULL,
  bonus_amount REAL NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 19. Bonus Config
CREATE TABLE IF NOT EXISTS bonus_config (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 20. Payment Gateway Config
CREATE TABLE IF NOT EXISTS payment_gateway_config (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  gateway TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(gateway, key)
);

-- 21. Credit Croissance
CREATE TABLE IF NOT EXISTS credit_croissance (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  member_id TEXT NOT NULL REFERENCES members(id),
  amount REAL NOT NULL,
  period TEXT NOT NULL,
  source_commission_id TEXT REFERENCES commissions(id),
  status TEXT NOT NULL DEFAULT 'held' CHECK(status IN ('held','used')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 22. Reserve Strategique
CREATE TABLE IF NOT EXISTS reserve_strategique (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  member_id TEXT NOT NULL REFERENCES members(id),
  amount REAL NOT NULL,
  period TEXT NOT NULL,
  source_commission_id TEXT REFERENCES commissions(id),
  locked_until TEXT NOT NULL,
  abondement_rate REAL NOT NULL DEFAULT 0.10,
  status TEXT NOT NULL DEFAULT 'locked' CHECK(status IN ('locked','released','forfeited')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 23. Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  member_id TEXT REFERENCES members(id),
  admin_id TEXT REFERENCES admin_users(id),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 24. Marketing Assets
CREATE TABLE IF NOT EXISTS marketing_assets (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('image','video','pdf','link')),
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  category TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- INDEX
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_members_sponsor ON members(sponsor_id);
CREATE INDEX IF NOT EXISTS idx_members_binary_parent ON members(binary_parent_id);
CREATE INDEX IF NOT EXISTS idx_members_status ON members(member_status);
CREATE INDEX IF NOT EXISTS idx_members_rank ON members(current_rank);
CREATE INDEX IF NOT EXISTS idx_package_orders_member ON package_orders(member_id);
CREATE INDEX IF NOT EXISTS idx_package_orders_status ON package_orders(status);
CREATE INDEX IF NOT EXISTS idx_commissions_member ON commissions(member_id);
CREATE INDEX IF NOT EXISTS idx_commissions_period ON commissions(period);
CREATE INDEX IF NOT EXISTS idx_bv_logs_member ON bv_logs(member_id);
CREATE INDEX IF NOT EXISTS idx_bv_logs_period ON bv_logs(period);
CREATE INDEX IF NOT EXISTS idx_bv_queue_status ON bv_queue(status);
CREATE INDEX IF NOT EXISTS idx_withdrawals_member ON withdrawals(member_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(status);
CREATE INDEX IF NOT EXISTS idx_notifications_member ON notifications(member_id);
CREATE INDEX IF NOT EXISTS idx_holding_tank_status ON holding_tank(status);
