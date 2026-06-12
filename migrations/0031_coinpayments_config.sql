-- Migration 0031 : Initialiser la config CoinPayments dans payment_gateway_config
-- gateway = 'coinpayments_api' — clés gérées depuis l'admin ou secrets Cloudflare (fallback)
-- Les valeurs sont vides par défaut : à configurer depuis l'interface admin

INSERT OR IGNORE INTO payment_gateway_config (id, gateway, key, value)
VALUES
  (lower(hex(randomblob(16))), 'coinpayments_api', 'merchant_id', ''),
  (lower(hex(randomblob(16))), 'coinpayments_api', 'public_key',  ''),
  (lower(hex(randomblob(16))), 'coinpayments_api', 'private_key', ''),
  (lower(hex(randomblob(16))), 'coinpayments_api', 'ipn_secret',  ''),
  (lower(hex(randomblob(16))), 'coinpayments_api', 'coins',       'USDT.TRC20,LTC,ETH,BTC'),
  (lower(hex(randomblob(16))), 'coinpayments_api', 'enabled',     'true');
