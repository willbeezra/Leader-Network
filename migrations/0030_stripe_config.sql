-- Migration 0030 : Initialiser la config Stripe dans payment_gateway_config
-- gateway = 'stripe_api' — clés gérées depuis l'admin ou secrets Cloudflare (fallback)

INSERT OR IGNORE INTO payment_gateway_config (id, gateway, key, value)
VALUES
  (lower(hex(randomblob(16))), 'stripe_api', 'public_key',     ''),
  (lower(hex(randomblob(16))), 'stripe_api', 'secret_key',     ''),
  (lower(hex(randomblob(16))), 'stripe_api', 'webhook_secret', ''),
  (lower(hex(randomblob(16))), 'stripe_api', 'mode',           'test'),
  (lower(hex(randomblob(16))), 'stripe_api', 'enabled',        'true');

-- Mettre à jour le CHECK constraint de payment_method pour accepter 'stripe'
-- Note : SQLite ne supporte pas ALTER COLUMN — on reconstruit la table
-- UNIQUEMENT si 'stripe' n'est pas déjà dans le constraint
-- (les migrations précédentes ont déjà reconfiguré payment_method via 0014/0023)
