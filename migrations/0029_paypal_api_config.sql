-- Migration 0029 : Pré-remplir payment_gateway_config pour PayPal API (SDK)
-- Permet de configurer les credentials PayPal depuis l'admin sans redéploiement.
-- gateway = 'paypal_api' (distinct de 'paypal' qui est le paiement manuel par email)
--
-- Les valeurs ci-dessous sont des PLACEHOLDERS.
-- À remplacer depuis l'admin → Passerelle de Paiement → PayPal API (boutons SDK).
-- Tant que ces valeurs restent vides, le système utilise en fallback les secrets
-- Cloudflare PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET / PAYPAL_MODE.

INSERT OR IGNORE INTO payment_gateway_config (id, gateway, key, value)
VALUES
  (lower(hex(randomblob(16))), 'paypal_api', 'client_id',     ''),
  (lower(hex(randomblob(16))), 'paypal_api', 'client_secret', ''),
  (lower(hex(randomblob(16))), 'paypal_api', 'mode',          'live'),
  (lower(hex(randomblob(16))), 'paypal_api', 'enabled',       'true');
