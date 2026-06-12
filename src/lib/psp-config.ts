// ─────────────────────────────────────────────────────────────────────────────
// PSP CONFIG — Définition centralisée de chaque fournisseur de paiement
// Chaque entry décrit : les champs de config admin, le type de flux,
// et comment initier un paiement réel.
// ─────────────────────────────────────────────────────────────────────────────

export type FieldType = 'text' | 'password' | 'email' | 'url' | 'select' | 'textarea'

export interface PSPField {
  key: string           // clé dans config JSON
  label: string         // label affiché à l'admin
  type: FieldType
  required: boolean
  placeholder?: string
  help?: string         // texte d'aide sous le champ
  options?: { value: string; label: string }[]  // pour select
  secret?: boolean      // masqué par défaut (password)
}

export type PSPType = 'auto' | 'semi_manual' | 'manual'

export interface PSPDefinition {
  provider: string
  type: PSPType
  // 'auto' = API complète, redirection + webhook
  // 'semi_manual' = compte email/numéro, membre envoie et uploade preuve
  // 'manual' = coordonnées bancaires/postales, preuve obligatoire
  fields: PSPField[]
  webhookNote?: string   // info sur le webhook à configurer dans le dashboard PSP
  testNote?: string      // comment tester la connexion
}

// ─────────────────────────────────────────────────────────────────────────────
// TYPE A — PSP AUTOMATIQUES (API complète)
// ─────────────────────────────────────────────────────────────────────────────

const STRIPE: PSPDefinition = {
  provider: 'stripe',
  type: 'auto',
  webhookNote: 'Dans votre dashboard Stripe → Developers → Webhooks, ajoutez l\'URL : {base_url}/api/psp/webhook/stripe — Événements : checkout.session.completed',
  testNote: 'Une fois les clés saisies, cliquez "Tester la connexion" pour vérifier avec l\'API Stripe.',
  fields: [
    {
      key: 'publishable_key',
      label: 'Clé publique (pk_live_... ou pk_test_...)',
      type: 'text',
      required: true,
      placeholder: 'pk_live_xxxxxxxxxxxx',
      help: 'Dashboard Stripe → Developers → API keys → Publishable key'
    },
    {
      key: 'secret_key',
      label: 'Clé secrète (sk_live_... ou sk_test_...)',
      type: 'password',
      required: true,
      placeholder: 'sk_live_xxxxxxxxxxxx',
      secret: true,
      help: 'Dashboard Stripe → Developers → API keys → Secret key'
    },
    {
      key: 'webhook_secret',
      label: 'Webhook Secret (whsec_...)',
      type: 'password',
      required: false,
      placeholder: 'whsec_xxxxxxxxxxxx',
      secret: true,
      help: 'Dashboard Stripe → Developers → Webhooks → Signing secret'
    }
  ]
}

const PAYPAL: PSPDefinition = {
  provider: 'paypal',
  type: 'auto',
  webhookNote: 'Dans votre compte PayPal Developer → Apps → Webhooks, ajoutez : {base_url}/api/psp/webhook/paypal — Événements : CHECKOUT.ORDER.APPROVED, PAYMENT.CAPTURE.COMPLETED',
  fields: [
    {
      key: 'client_id',
      label: 'Client ID',
      type: 'text',
      required: true,
      placeholder: 'AXxxxxxxxxxxxxxxxxxx',
      help: 'developer.paypal.com → My Apps & Credentials → App → Client ID'
    },
    {
      key: 'client_secret',
      label: 'Client Secret',
      type: 'password',
      required: true,
      placeholder: 'EKxxxxxxxxxxxxxxxxxx',
      secret: true,
      help: 'developer.paypal.com → My Apps & Credentials → App → Secret'
    },
    {
      key: 'mode',
      label: 'Environnement',
      type: 'select',
      required: true,
      options: [
        { value: 'live', label: 'Production (live)' },
        { value: 'sandbox', label: 'Test (sandbox)' }
      ]
    },
    {
      key: 'webhook_id',
      label: 'Webhook ID (optionnel, recommandé)',
      type: 'text',
      required: false,
      placeholder: 'WH-xxxxxxxxxxxx-xxxxxxxxxxxx',
      help: 'developer.paypal.com → Apps → Webhooks → Webhook ID — Permet la vérification cryptographique des notifications'
    }
  ]
}

const MOLLIE: PSPDefinition = {
  provider: 'mollie',
  type: 'auto',
  webhookNote: 'Mollie envoie les webhooks automatiquement à l\'URL configurée dans chaque paiement. Aucune configuration dashboard requise.',
  fields: [
    {
      key: 'api_key',
      label: 'API Key (live_... ou test_...)',
      type: 'password',
      required: true,
      placeholder: 'live_xxxxxxxxxxxx',
      secret: true,
      help: 'Dashboard Mollie → Developers → API keys → Live API key'
    }
  ]
}

const FLUTTERWAVE: PSPDefinition = {
  provider: 'flutterwave',
  type: 'auto',
  webhookNote: 'Dashboard Flutterwave → Settings → Webhooks, ajoutez : {base_url}/api/psp/webhook/flutterwave',
  fields: [
    {
      key: 'public_key',
      label: 'Public Key (FLWPUBK_...)',
      type: 'text',
      required: true,
      placeholder: 'FLWPUBK_TEST-xxxxxxxxxxxx-X',
      help: 'Dashboard Flutterwave → Settings → API Keys'
    },
    {
      key: 'secret_key',
      label: 'Secret Key (FLWSECK_...)',
      type: 'password',
      required: true,
      placeholder: 'FLWSECK_TEST-xxxxxxxxxxxx-X',
      secret: true,
      help: 'Dashboard Flutterwave → Settings → API Keys'
    },
    {
      key: 'encryption_key',
      label: 'Encryption Key',
      type: 'password',
      required: false,
      placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      secret: true,
      help: 'Dashboard Flutterwave → Settings → API Keys (3DES encryption key)'
    },
    {
      key: 'secret_hash',
      label: 'Secret Hash webhook (optionnel, recommandé)',
      type: 'password',
      required: false,
      placeholder: 'votre-secret-hash-webhook',
      secret: true,
      help: 'Dashboard Flutterwave → Settings → Webhooks → Secret hash — Utilisé pour vérifier l\'authenticité des webhooks'
    },
    {
      key: 'currency',
      label: 'Devise de paiement',
      type: 'select',
      required: true,
      options: [
        { value: 'USD', label: 'USD — Dollar américain' },
        { value: 'EUR', label: 'EUR — Euro' },
        { value: 'GBP', label: 'GBP — Livre sterling' },
        { value: 'NGN', label: 'NGN — Naira nigérian' },
        { value: 'GHS', label: 'GHS — Cedi ghanéen' },
        { value: 'KES', label: 'KES — Shilling kényan' },
        { value: 'ZAR', label: 'ZAR — Rand sud-africain' },
        { value: 'XOF', label: 'XOF — Franc CFA BCEAO' },
        { value: 'XAF', label: 'XAF — Franc CFA BEAC' },
        { value: 'MAD', label: 'MAD — Dirham marocain' },
        { value: 'MUR', label: 'MUR — Roupie mauricienne' }
      ]
    }
  ]
}

const RAZORPAY: PSPDefinition = {
  provider: 'razorpay',
  type: 'auto',
  webhookNote: 'Dashboard Razorpay → Settings → Webhooks, ajoutez : {base_url}/api/psp/webhook/razorpay — Secret : votre webhook_secret',
  fields: [
    {
      key: 'key_id',
      label: 'Key ID (rzp_live_... ou rzp_test_...)',
      type: 'text',
      required: true,
      placeholder: 'rzp_live_xxxxxxxxxxxx',
      help: 'Dashboard Razorpay → Account & Settings → API Keys'
    },
    {
      key: 'key_secret',
      label: 'Key Secret',
      type: 'password',
      required: true,
      placeholder: 'xxxxxxxxxxxxxxxxxxxx',
      secret: true,
      help: 'Dashboard Razorpay → Account & Settings → API Keys → Generate Key'
    },
    {
      key: 'webhook_secret',
      label: 'Webhook Secret (optionnel)',
      type: 'password',
      required: false,
      placeholder: 'xxxxxxxxxxxxxxxxxxxx',
      secret: true,
      help: 'Dashboard Razorpay → Settings → Webhooks → secret'
    }
  ]
}

const SQUARE: PSPDefinition = {
  provider: 'square',
  type: 'auto',
  webhookNote: 'Dashboard Square → Developers → Webhooks, ajoutez : {base_url}/api/psp/webhook/square',
  fields: [
    {
      key: 'access_token',
      label: 'Access Token',
      type: 'password',
      required: true,
      placeholder: 'EAAAxxxxxxxxxxxxxxxxxx',
      secret: true,
      help: 'developer.squareup.com → Applications → votre app → Access token'
    },
    {
      key: 'location_id',
      label: 'Location ID',
      type: 'text',
      required: true,
      placeholder: 'LXXXXXXXXXXXXXXXXX',
      help: 'Dashboard Square → Locations → votre boutique → Location ID'
    },
    {
      key: 'environment',
      label: 'Environnement',
      type: 'select',
      required: true,
      options: [
        { value: 'production', label: 'Production' },
        { value: 'sandbox', label: 'Sandbox (test)' }
      ]
    },
    {
      key: 'webhook_signature_key',
      label: 'Webhook Signature Key (optionnel)',
      type: 'password',
      required: false,
      secret: true,
      help: 'Dashboard Square → Developers → Webhooks → Signature key'
    }
  ]
}

const ADYEN: PSPDefinition = {
  provider: 'adyen',
  type: 'auto',
  webhookNote: 'Dashboard Adyen → Developers → Webhooks → Standard, ajoutez : {base_url}/api/psp/webhook/adyen',
  fields: [
    {
      key: 'api_key',
      label: 'API Key',
      type: 'password',
      required: true,
      placeholder: 'AQExxxxxxxxxxxxx...',
      secret: true,
      help: 'Dashboard Adyen → Developers → API credentials → API key'
    },
    {
      key: 'merchant_account',
      label: 'Merchant Account',
      type: 'text',
      required: true,
      placeholder: 'YourCompanyECOM',
      help: 'Dashboard Adyen → Account → Merchant accounts → Account code'
    },
    {
      key: 'client_key',
      label: 'Client Key',
      type: 'text',
      required: true,
      placeholder: 'test_xxxxxxxxxxxx',
      help: 'Dashboard Adyen → Developers → API credentials → Client key (pour le SDK front)'
    },
    {
      key: 'environment',
      label: 'Environnement',
      type: 'select',
      required: true,
      options: [
        { value: 'live', label: 'Production (live)' },
        { value: 'test', label: 'Test' }
      ]
    },
    {
      key: 'webhook_hmac',
      label: 'Webhook HMAC Key (optionnel)',
      type: 'password',
      required: false,
      secret: true,
      help: 'Dashboard Adyen → Developers → Webhooks → HMAC key'
    }
  ]
}

const CHECKOUT_COM: PSPDefinition = {
  provider: 'checkout_com',
  type: 'auto',
  webhookNote: 'Dashboard Checkout.com → Developers → Webhooks, ajoutez : {base_url}/api/psp/webhook/checkout_com',
  fields: [
    {
      key: 'secret_key',
      label: 'Secret Key (sk_...)',
      type: 'password',
      required: true,
      placeholder: 'sk_xxxxxxxxxxxxxxxxxxxxxxxx',
      secret: true,
      help: 'Dashboard Checkout.com → Developers → Keys → Secret key'
    },
    {
      key: 'public_key',
      label: 'Public Key (pk_...)',
      type: 'text',
      required: true,
      placeholder: 'pk_xxxxxxxxxxxxxxxxxxxxxxxx',
      help: 'Dashboard Checkout.com → Developers → Keys → Public key'
    },
    {
      key: 'webhook_signature',
      label: 'Webhook Signature (optionnel)',
      type: 'password',
      required: false,
      secret: true,
      help: 'Dashboard Checkout.com → Developers → Webhooks → Signature key'
    }
  ]
}

// ─────────────────────────────────────────────────────────────────────────────
// CRYPTO — PSP AUTOMATIQUES CRYPTO
// ─────────────────────────────────────────────────────────────────────────────

const COINPAYMENTS: PSPDefinition = {
  provider: 'coinpayments',
  type: 'auto',
  webhookNote: 'CoinPayments envoie des IPN automatiquement. L\'URL IPN à utiliser est : {base_url}/api/psp/webhook/coinpayments',
  fields: [
    {
      key: 'public_key',
      label: 'Public Key',
      type: 'text',
      required: true,
      placeholder: 'xxxxxxxxxxxxxxxxxxxx',
      help: 'Dashboard CoinPayments → Account → API Keys → Public Key'
    },
    {
      key: 'private_key',
      label: 'Private Key',
      type: 'password',
      required: true,
      placeholder: 'xxxxxxxxxxxxxxxxxxxx',
      secret: true,
      help: 'Dashboard CoinPayments → Account → API Keys → Private Key'
    },
    {
      key: 'merchant_id',
      label: 'Merchant ID',
      type: 'text',
      required: true,
      placeholder: 'xxxxxxxxxxxxxxxxxxxx',
      help: 'Dashboard CoinPayments → Account → Settings → Merchant ID'
    },
    {
      key: 'ipn_secret',
      label: 'IPN Secret',
      type: 'password',
      required: true,
      placeholder: 'xxxxxxxxxxxxxxxxxxxx',
      secret: true,
      help: 'Dashboard CoinPayments → Account → Settings → IPN Secret'
    },
    {
      key: 'receive_currency',
      label: 'Devise de réception',
      type: 'select',
      required: true,
      options: [
        { value: 'USDT.TRC20', label: 'USDT (TRC-20 / Tron)' },
        { value: 'USDT.ERC20', label: 'USDT (ERC-20 / Ethereum)' },
        { value: 'BTC', label: 'Bitcoin (BTC)' },
        { value: 'ETH', label: 'Ethereum (ETH)' },
        { value: 'LTC', label: 'Litecoin (LTC)' }
      ]
    }
  ]
}

const COINBASE_COMMERCE: PSPDefinition = {
  provider: 'coinbase_commerce',
  type: 'auto',
  webhookNote: 'Dashboard Coinbase Commerce → Settings → Webhook subscriptions, ajoutez : {base_url}/api/psp/webhook/coinbase_commerce',
  fields: [
    {
      key: 'api_key',
      label: 'API Key',
      type: 'password',
      required: true,
      placeholder: 'xxxxxxxxxxxxxxxxxxxx',
      secret: true,
      help: 'Dashboard Coinbase Commerce → Settings → API keys → Create an API key'
    },
    {
      key: 'webhook_secret',
      label: 'Webhook Shared Secret',
      type: 'password',
      required: false,
      placeholder: 'xxxxxxxxxxxxxxxxxxxx',
      secret: true,
      help: 'Dashboard Coinbase Commerce → Settings → Webhook subscriptions → Shared secret'
    }
  ]
}

const NOWPAYMENTS: PSPDefinition = {
  provider: 'nowpayments',
  type: 'auto',
  webhookNote: 'NOWPayments envoie des callbacks IPN à l\'URL configurée dans chaque paiement. L\'IPN secret key est requis pour la vérification de signature.',
  fields: [
    {
      key: 'api_key',
      label: 'API Key',
      type: 'password',
      required: true,
      placeholder: 'xxxxxxxxxxxxxxxxxxxx',
      secret: true,
      help: 'Dashboard NOWPayments → Store Settings → API keys → Add new key'
    },
    {
      key: 'ipn_secret_key',
      label: 'IPN Secret Key',
      type: 'password',
      required: true,
      placeholder: 'xxxxxxxxxxxxxxxxxxxx',
      secret: true,
      help: 'Dashboard NOWPayments → Store Settings → Instant Payment Notifications → IPN secret key'
    },
    {
      key: 'pay_currency',
      label: 'Cryptomonnaie acceptée',
      type: 'select',
      required: true,
      options: [
        { value: 'usdttrc20', label: 'USDT (TRC-20 / Tron)' },
        { value: 'usdterc20', label: 'USDT (ERC-20 / Ethereum)' },
        { value: 'btc', label: 'Bitcoin (BTC)' },
        { value: 'eth', label: 'Ethereum (ETH)' },
        { value: 'ltc', label: 'Litecoin (LTC)' },
        { value: 'bnb', label: 'BNB' },
        { value: 'matic', label: 'MATIC (Polygon)' }
      ]
    }
  ]
}

const BINANCE_PAY: PSPDefinition = {
  provider: 'binance_pay',
  type: 'auto',
  webhookNote: 'Dashboard Binance Pay → Merchant → Webhook, ajoutez : {base_url}/api/psp/webhook/binance_pay',
  fields: [
    {
      key: 'api_key',
      label: 'API Key',
      type: 'text',
      required: true,
      placeholder: 'xxxxxxxxxxxxxxxxxxxx',
      help: 'Dashboard Binance Merchant → Developers → API Keys'
    },
    {
      key: 'api_secret',
      label: 'API Secret',
      type: 'password',
      required: true,
      placeholder: 'xxxxxxxxxxxxxxxxxxxx',
      secret: true,
      help: 'Dashboard Binance Merchant → Developers → API Keys → Secret'
    }
  ]
}

const BTCPAY: PSPDefinition = {
  provider: 'btcpay',
  type: 'auto',
  webhookNote: 'BTCPay Server : Store → Settings → Webhooks, ajoutez : {base_url}/api/psp/webhook/btcpay — Événements : InvoiceSettled, InvoiceExpired',
  fields: [
    {
      key: 'server_url',
      label: 'URL de votre BTCPay Server',
      type: 'url',
      required: true,
      placeholder: 'https://btcpay.votredomaine.com',
      help: 'L\'URL racine de votre instance BTCPay Server'
    },
    {
      key: 'store_id',
      label: 'Store ID',
      type: 'text',
      required: true,
      placeholder: 'xxxxxxxxxxxxxxxxxxxx',
      help: 'BTCPay → Store → Settings → Store ID'
    },
    {
      key: 'api_key',
      label: 'API Key',
      type: 'password',
      required: true,
      placeholder: 'xxxxxxxxxxxxxxxxxxxx',
      secret: true,
      help: 'BTCPay → Account → Manage Account → API keys → Generate key (invoices:create, invoices:read)'
    },
    {
      key: 'webhook_secret',
      label: 'Webhook Secret',
      type: 'password',
      required: false,
      placeholder: 'xxxxxxxxxxxxxxxxxxxx',
      secret: true,
      help: 'BTCPay → Store → Settings → Webhooks → secret'
    }
  ]
}

// ─────────────────────────────────────────────────────────────────────────────
// TYPE B — SEMI-MANUELS (compte email/numéro + upload preuve)
// ─────────────────────────────────────────────────────────────────────────────

const SKRILL: PSPDefinition = {
  provider: 'skrill',
  type: 'semi_manual',
  fields: [
    {
      key: 'email',
      label: 'Email du compte Skrill',
      type: 'email',
      required: true,
      placeholder: 'votre@email.com',
      help: 'L\'email associé à votre compte Skrill vers lequel les membres enverront les paiements'
    },
    {
      key: 'account_name',
      label: 'Nom du titulaire du compte',
      type: 'text',
      required: true,
      placeholder: 'Prénom NOM',
      help: 'Tel qu\'il apparaît sur votre compte Skrill'
    },
    {
      key: 'instructions',
      label: 'Instructions pour le membre',
      type: 'textarea',
      required: false,
      placeholder: 'Envoyez le montant à : votre@email.com sur Skrill. Mentionnez votre ID membre en référence.',
      help: 'Ces instructions seront affichées au membre lors du paiement'
    }
  ]
}

const NETELLER: PSPDefinition = {
  provider: 'neteller',
  type: 'semi_manual',
  fields: [
    {
      key: 'email',
      label: 'Email / Account ID Neteller',
      type: 'email',
      required: true,
      placeholder: 'votre@email.com',
      help: 'L\'email ou l\'identifiant Neteller vers lequel envoyer'
    },
    {
      key: 'account_name',
      label: 'Nom du titulaire',
      type: 'text',
      required: true,
      placeholder: 'Prénom NOM'
    },
    {
      key: 'instructions',
      label: 'Instructions',
      type: 'textarea',
      required: false,
      placeholder: 'Envoyez via Neteller à votre@email.com'
    }
  ]
}

const PAYONEER: PSPDefinition = {
  provider: 'payoneer',
  type: 'semi_manual',
  fields: [
    {
      key: 'email',
      label: 'Email Payoneer',
      type: 'email',
      required: true,
      placeholder: 'votre@email.com',
      help: 'Email du compte Payoneer récepteur'
    },
    {
      key: 'account_name',
      label: 'Nom du titulaire',
      type: 'text',
      required: true,
      placeholder: 'Prénom NOM'
    },
    {
      key: 'instructions',
      label: 'Instructions',
      type: 'textarea',
      required: false,
      placeholder: 'Utilisez l\'option "Send to Email" dans Payoneer'
    }
  ]
}

const WISE: PSPDefinition = {
  provider: 'wise',
  type: 'semi_manual',
  fields: [
    {
      key: 'email',
      label: 'Email Wise',
      type: 'email',
      required: true,
      placeholder: 'votre@email.com',
      help: 'Email du compte Wise pour recevoir les paiements'
    },
    {
      key: 'account_name',
      label: 'Nom du titulaire',
      type: 'text',
      required: true,
      placeholder: 'Prénom NOM'
    },
    {
      key: 'instructions',
      label: 'Instructions',
      type: 'textarea',
      required: false,
      placeholder: 'Envoyez via Wise (ancien TransferWise) à votre@email.com'
    }
  ]
}

const REVOLUT: PSPDefinition = {
  provider: 'revolut',
  type: 'semi_manual',
  fields: [
    {
      key: 'revolut_tag',
      label: 'Tag Revolut (@tag) ou numéro de téléphone',
      type: 'text',
      required: true,
      placeholder: '@votretag ou +33612345678',
      help: 'Le tag @revolut ou numéro de téléphone pour recevoir les paiements'
    },
    {
      key: 'account_name',
      label: 'Nom du titulaire',
      type: 'text',
      required: true,
      placeholder: 'Prénom NOM'
    },
    {
      key: 'instructions',
      label: 'Instructions',
      type: 'textarea',
      required: false,
      placeholder: 'Envoyez via l\'app Revolut à @votretag'
    }
  ]
}

const SUMOPAY: PSPDefinition = {
  provider: 'sumopay',
  type: 'semi_manual',
  fields: [
    {
      key: 'account_number',
      label: 'Numéro de compte SumoPay',
      type: 'text',
      required: true,
      placeholder: 'SUMO-XXXXXXXXXX'
    },
    {
      key: 'account_name',
      label: 'Nom du titulaire',
      type: 'text',
      required: true,
      placeholder: 'Prénom NOM'
    },
    {
      key: 'instructions',
      label: 'Instructions',
      type: 'textarea',
      required: false
    }
  ]
}

// ─────────────────────────────────────────────────────────────────────────────
// TYPE C — MANUELS PURS (coordonnées bancaires / postales)
// ─────────────────────────────────────────────────────────────────────────────

const SEPA: PSPDefinition = {
  provider: 'sepa',
  type: 'manual',
  fields: [
    {
      key: 'account_name',
      label: 'Nom du titulaire du compte',
      type: 'text',
      required: true,
      placeholder: 'Nom Société ou Prénom NOM'
    },
    {
      key: 'iban',
      label: 'IBAN',
      type: 'text',
      required: true,
      placeholder: 'FR76 3000 1007 1500 0000 0000 000',
      help: 'Format : FR76 xxxx xxxx xxxx xxxx xxxx xxx'
    },
    {
      key: 'bic',
      label: 'BIC / SWIFT',
      type: 'text',
      required: true,
      placeholder: 'BNPAFRPPXXX'
    },
    {
      key: 'bank_name',
      label: 'Nom de la banque',
      type: 'text',
      required: true,
      placeholder: 'BNP Paribas'
    },
    {
      key: 'instructions',
      label: 'Instructions supplémentaires',
      type: 'textarea',
      required: false,
      placeholder: 'Mentionnez votre ID membre en référence de virement'
    }
  ]
}

const SWIFT: PSPDefinition = {
  provider: 'swift',
  type: 'manual',
  fields: [
    {
      key: 'account_name',
      label: 'Nom du titulaire',
      type: 'text',
      required: true,
      placeholder: 'Nom Société ou Prénom NOM'
    },
    {
      key: 'account_number',
      label: 'Numéro de compte',
      type: 'text',
      required: true,
      placeholder: 'xxxxxxxxxxxxxxxxxxxx'
    },
    {
      key: 'swift_code',
      label: 'Code SWIFT',
      type: 'text',
      required: true,
      placeholder: 'BNPAFRPPXXX'
    },
    {
      key: 'bank_name',
      label: 'Nom de la banque',
      type: 'text',
      required: true,
      placeholder: 'BNP Paribas'
    },
    {
      key: 'bank_address',
      label: 'Adresse de la banque',
      type: 'textarea',
      required: false,
      placeholder: '16 Boulevard des Italiens, 75009 Paris, France'
    },
    {
      key: 'instructions',
      label: 'Instructions',
      type: 'textarea',
      required: false
    }
  ]
}

const LOCAL_BANK: PSPDefinition = {
  provider: 'local_bank',
  type: 'manual',
  fields: [
    {
      key: 'account_name',
      label: 'Nom du titulaire',
      type: 'text',
      required: true,
      placeholder: 'Nom Société ou Prénom NOM'
    },
    {
      key: 'account_number',
      label: 'Numéro de compte',
      type: 'text',
      required: true,
      placeholder: 'xxxxxxxxxxxxxxx'
    },
    {
      key: 'bank_name',
      label: 'Nom de la banque',
      type: 'text',
      required: true,
      placeholder: 'Banque locale'
    },
    {
      key: 'branch_code',
      label: 'Code agence / Routing number',
      type: 'text',
      required: false,
      placeholder: 'xxxxxxx'
    },
    {
      key: 'country',
      label: 'Pays',
      type: 'text',
      required: true,
      placeholder: 'France'
    },
    {
      key: 'instructions',
      label: 'Instructions',
      type: 'textarea',
      required: false
    }
  ]
}

const WESTERN_UNION: PSPDefinition = {
  provider: 'western_union',
  type: 'manual',
  fields: [
    {
      key: 'recipient_first_name',
      label: 'Prénom du bénéficiaire',
      type: 'text',
      required: true,
      placeholder: 'Prénom'
    },
    {
      key: 'recipient_last_name',
      label: 'Nom du bénéficiaire',
      type: 'text',
      required: true,
      placeholder: 'NOM'
    },
    {
      key: 'country',
      label: 'Pays de réception',
      type: 'text',
      required: true,
      placeholder: 'France'
    },
    {
      key: 'city',
      label: 'Ville de réception',
      type: 'text',
      required: true,
      placeholder: 'Paris'
    },
    {
      key: 'instructions',
      label: 'Instructions',
      type: 'textarea',
      required: false,
      help: 'Ex: Envoyez à PRENOM NOM, ville X, pays Y. Communiquez le numéro MTCN par email.'
    }
  ]
}

const MONEYGRAM: PSPDefinition = {
  provider: 'moneygram',
  type: 'manual',
  fields: [
    {
      key: 'recipient_first_name',
      label: 'Prénom du bénéficiaire',
      type: 'text',
      required: true,
      placeholder: 'Prénom'
    },
    {
      key: 'recipient_last_name',
      label: 'Nom du bénéficiaire',
      type: 'text',
      required: true,
      placeholder: 'NOM'
    },
    {
      key: 'country',
      label: 'Pays de réception',
      type: 'text',
      required: true,
      placeholder: 'France'
    },
    {
      key: 'city',
      label: 'Ville de réception',
      type: 'text',
      required: true,
      placeholder: 'Paris'
    },
    {
      key: 'instructions',
      label: 'Instructions',
      type: 'textarea',
      required: false
    }
  ]
}

const CASH_IN_PERSON: PSPDefinition = {
  provider: 'cash_in_person',
  type: 'manual',
  fields: [
    {
      key: 'contact_name',
      label: 'Nom du contact',
      type: 'text',
      required: true,
      placeholder: 'Prénom NOM'
    },
    {
      key: 'phone',
      label: 'Téléphone de contact',
      type: 'text',
      required: true,
      placeholder: '+33 6 12 34 56 78'
    },
    {
      key: 'address',
      label: 'Adresse de rendez-vous',
      type: 'textarea',
      required: false,
      placeholder: '12 Rue de la Paix, 75001 Paris'
    },
    {
      key: 'schedule',
      label: 'Horaires disponibles',
      type: 'text',
      required: false,
      placeholder: 'Lun-Ven 9h-18h'
    },
    {
      key: 'instructions',
      label: 'Instructions',
      type: 'textarea',
      required: false,
      placeholder: 'Appelez d\'abord pour prendre rendez-vous'
    }
  ]
}

// ─── Mobile Money ────────────────────────────────────────────────────────────

const JUICE: PSPDefinition = {
  provider: 'juice',
  type: 'manual',
  fields: [
    {
      key: 'phone_number',
      label: 'Numéro de téléphone Juice',
      type: 'text',
      required: true,
      placeholder: '+230 XXXX XXXX',
      help: 'Numéro Juice Money (Maurice) vers lequel envoyer'
    },
    {
      key: 'account_name',
      label: 'Nom du titulaire',
      type: 'text',
      required: true,
      placeholder: 'Prénom NOM'
    },
    {
      key: 'instructions',
      label: 'Instructions',
      type: 'textarea',
      required: false,
      placeholder: 'Envoyez via Juice Money au +230 XXXX XXXX. Mentionnez votre ID en référence.'
    }
  ]
}

const MPESA: PSPDefinition = {
  provider: 'mpesa',
  type: 'manual',
  fields: [
    {
      key: 'phone_number',
      label: 'Numéro M-Pesa',
      type: 'text',
      required: true,
      placeholder: '+254 7XX XXX XXX',
      help: 'Numéro de téléphone M-Pesa ou numéro Paybill'
    },
    {
      key: 'account_name',
      label: 'Nom du titulaire',
      type: 'text',
      required: true,
      placeholder: 'Prénom NOM'
    },
    {
      key: 'paybill',
      label: 'Numéro Paybill (si applicable)',
      type: 'text',
      required: false,
      placeholder: '123456'
    },
    {
      key: 'instructions',
      label: 'Instructions',
      type: 'textarea',
      required: false
    }
  ]
}

const ORANGE_MONEY: PSPDefinition = {
  provider: 'orange_money',
  type: 'manual',
  fields: [
    {
      key: 'phone_number',
      label: 'Numéro Orange Money',
      type: 'text',
      required: true,
      placeholder: '+221 77 XXX XX XX',
      help: 'Numéro de téléphone Orange Money'
    },
    {
      key: 'account_name',
      label: 'Nom du titulaire',
      type: 'text',
      required: true,
      placeholder: 'Prénom NOM'
    },
    {
      key: 'country',
      label: 'Pays',
      type: 'text',
      required: false,
      placeholder: 'Sénégal, Côte d\'Ivoire...'
    },
    {
      key: 'instructions',
      label: 'Instructions',
      type: 'textarea',
      required: false
    }
  ]
}

const WAVE: PSPDefinition = {
  provider: 'wave',
  type: 'manual',
  fields: [
    {
      key: 'phone_number',
      label: 'Numéro Wave',
      type: 'text',
      required: true,
      placeholder: '+221 77 XXX XX XX'
    },
    {
      key: 'account_name',
      label: 'Nom du titulaire',
      type: 'text',
      required: true,
      placeholder: 'Prénom NOM'
    },
    {
      key: 'instructions',
      label: 'Instructions',
      type: 'textarea',
      required: false
    }
  ]
}

const MTN_MOMO: PSPDefinition = {
  provider: 'mtn_momo',
  type: 'manual',
  fields: [
    {
      key: 'phone_number',
      label: 'Numéro MTN MoMo',
      type: 'text',
      required: true,
      placeholder: '+233 XX XXX XXXX'
    },
    {
      key: 'account_name',
      label: 'Nom du titulaire',
      type: 'text',
      required: true,
      placeholder: 'Prénom NOM'
    },
    {
      key: 'momo_code',
      label: 'Code MoMo (si applicable)',
      type: 'text',
      required: false,
      placeholder: 'XXXXXX'
    },
    {
      key: 'instructions',
      label: 'Instructions',
      type: 'textarea',
      required: false
    }
  ]
}

const AIRTEL_MONEY: PSPDefinition = {
  provider: 'airtel_money',
  type: 'manual',
  fields: [
    {
      key: 'phone_number',
      label: 'Numéro Airtel Money',
      type: 'text',
      required: true,
      placeholder: '+260 97X XXX XXX'
    },
    {
      key: 'account_name',
      label: 'Nom du titulaire',
      type: 'text',
      required: true,
      placeholder: 'Prénom NOM'
    },
    {
      key: 'instructions',
      label: 'Instructions',
      type: 'textarea',
      required: false
    }
  ]
}

const LYDIA: PSPDefinition = {
  provider: 'lydia',
  type: 'manual',
  fields: [
    {
      key: 'phone_number',
      label: 'Numéro de téléphone Lydia / Sumeria',
      type: 'text',
      required: true,
      placeholder: '+33 6 XX XX XX XX'
    },
    {
      key: 'lydia_tag',
      label: 'Tag Lydia (optionnel)',
      type: 'text',
      required: false,
      placeholder: '@votretag'
    },
    {
      key: 'account_name',
      label: 'Nom du titulaire',
      type: 'text',
      required: true,
      placeholder: 'Prénom NOM'
    },
    {
      key: 'instructions',
      label: 'Instructions',
      type: 'textarea',
      required: false
    }
  ]
}

// ─────────────────────────────────────────────────────────────────────────────
// MAP GLOBALE — provider → PSPDefinition
// ─────────────────────────────────────────────────────────────────────────────

export const PSP_CONFIG: Record<string, PSPDefinition> = {
  // Auto
  stripe: STRIPE,
  paypal: PAYPAL,
  mollie: MOLLIE,
  flutterwave: FLUTTERWAVE,
  razorpay: RAZORPAY,
  square: SQUARE,
  adyen: ADYEN,
  checkout_com: CHECKOUT_COM,
  coinpayments: COINPAYMENTS,
  coinbase_commerce: COINBASE_COMMERCE,
  nowpayments: NOWPAYMENTS,
  binance_pay: BINANCE_PAY,
  btcpay: BTCPAY,
  // Semi-manuel
  skrill: SKRILL,
  neteller: NETELLER,
  payoneer: PAYONEER,
  wise: WISE,
  revolut: REVOLUT,
  sumopay: SUMOPAY,
  // Manuel
  sepa: SEPA,
  swift: SWIFT,
  local_bank: LOCAL_BANK,
  western_union: WESTERN_UNION,
  moneygram: MONEYGRAM,
  cash_in_person: CASH_IN_PERSON,
  juice: JUICE,
  mpesa: MPESA,
  orange_money: ORANGE_MONEY,
  wave: WAVE,
  mtn_momo: MTN_MOMO,
  airtel_money: AIRTEL_MONEY,
  lydia: LYDIA
}

// Helper : savoir si un provider est "auto" (a une vraie API de paiement)
export function isAutoPSP(provider: string): boolean {
  return PSP_CONFIG[provider]?.type === 'auto'
}

// Helper : obtenir les champs d'un provider
export function getPSPFields(provider: string): PSPField[] {
  return PSP_CONFIG[provider]?.fields ?? []
}

// Helper : valider qu'une config contient tous les champs requis
export function validatePSPConfig(provider: string, config: Record<string, any>): string[] {
  const errors: string[] = []
  const def = PSP_CONFIG[provider]
  if (!def) return ['Provider inconnu : ' + provider]
  for (const field of def.fields) {
    if (field.required && !config[field.key]) {
      errors.push(`Champ requis manquant : ${field.label}`)
    }
  }
  return errors
}
