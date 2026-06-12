-- Table wallet_transactions : historique de TOUS les mouvements de wallet
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  member_id TEXT NOT NULL,
  wallet_type TEXT NOT NULL DEFAULT 'principal', -- 'principal', 'pending', 'dreamiles'
  transaction_type TEXT NOT NULL, -- 'credit_daily', 'credit_commission', 'debit_withdrawal', 'debit_transfer', 'credit_transfer', 'credit_fast_start', 'credit_leadership', etc.
  amount REAL NOT NULL,
  balance_before REAL NOT NULL DEFAULT 0,
  balance_after REAL NOT NULL DEFAULT 0,
  description TEXT,
  reference_id TEXT, -- ID de la commission/pending_wallet_entry/withdrawal associé
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (member_id) REFERENCES members(id)
);

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_member ON wallet_transactions(member_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_type ON wallet_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_created ON wallet_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet_type ON wallet_transactions(wallet_type);
