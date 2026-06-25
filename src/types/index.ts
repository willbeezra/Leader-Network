// ============================================================
// LEADER — Types TypeScript
// ============================================================

export type MemberStatus = 'Membre' | 'Client' | 'Partenaire' | 'AMI'
export type KycStatus = 'not_submitted' | 'pending' | 'verified' | 'rejected'
export type BinaryPosition = 'L' | 'R'

export type RankName =
  | 'none'
  | 'Administrator'
  | 'Manager'
  | 'Captain'
  | 'Leader'
  | 'Mentor'
  | 'Superviseur'
  | 'Executive'
  | 'President'
  | 'Director'
  | 'Boss'
  | 'Visionary'

export type CommissionType =
  | 'prime_leadership'
  | 'bonus_influence'
  | 'bonus_rayonnement'
  | 'valorisation_recommandation'
  | 'fast_start'
  | 'credit_croissance'
  | 'reserve_strategique'

export interface Member {
  id: string
  unique_id: string
  email: string
  first_name: string
  last_name: string
  phone?: string
  country?: string
  sponsor_id?: string
  binary_parent_id?: string
  binary_position?: BinaryPosition
  member_status: MemberStatus
  current_rank: RankName
  // BV totaux (cumulatif depuis l'inscription)
  left_bv_total: number
  right_bv_total: number
  personal_bv_total: number
  // BV du mois courant (reset le 1er du mois)
  left_bv_monthly: number
  right_bv_monthly: number
  personal_bv_monthly: number
  // BV Fast Start — cumulatif depuis activation, JAMAIS remis à 0 (FIX B4)
  fast_start_bv: number
  // Package
  package_type?: string        // 'Production' | 'Pinnacle' | null
  package_purchased: number    // 0 ou 1
  // Licence
  license_active: number
  license_expires_at?: string
  // KYC
  kyc_status: KycStatus
  kyc_document_url?: string
  kyc_reviewed_at?: string
  // Fast Start
  fast_start_start_date?: string
  fast_start_completed: number
  // Placement
  in_holding_tank: number
  // Wallet
  wallet_balance: number       // Solde retirable (crédité journalièrement M+1)
  // Épargne
  credit_croissance: number    // Cumul CC bloqué (Leader+)
  reserve_strategique: number  // Cumul RS bloqué 36 mois (Mentor+)
  // Profil
  avatar_url?: string
  paypal_email?: string
  pin_hash?: string
  created_at: string
  updated_at: string
}

export interface Package {
  id: string
  name: string
  slug: string
  price_usd: number
  bv_value: number
  description?: string
  features?: string
  is_active: number
}

export interface RankConfig {
  rank_name: string
  rank_order: number
  min_bv_leg: number
  min_directs: number
  min_monthly_package_value: number  // seuil de qualification des directs — configurable admin
  monthly_prime: number
  monthly_cap: number
}

export interface Commission {
  id: string
  member_id: string
  type: CommissionType
  amount: number
  description?: string
  period?: string
  source_member_id?: string
  rank_at_time?: string
  status: string
  paid_at?: string
  created_at: string
}

export interface Withdrawal {
  id: string
  member_id: string
  amount: number
  fee: number
  net_amount: number
  paypal_email: string
  status: string
  admin_note?: string
  created_at: string
}

export type Bindings = {
  DB: D1Database
  JWT_SECRET: string
  FILES_KV?: KVNamespace       // Stockage binaire des fichiers uploadés (optionnel — absent en gsk-hosted)
  PAYPAL_CLIENT_ID: string     // PayPal App Client ID (sandbox ou live)
  PAYPAL_CLIENT_SECRET: string // PayPal App Client Secret
  PAYPAL_MODE: string          // 'sandbox' | 'live'
  PAYPAL_WEBHOOK_ID?: string   // ID du webhook pour vérification de signature (optionnel)
  STRIPE_PUBLIC_KEY: string    // Stripe Publishable Key (pk_live_... ou pk_test_...)
  STRIPE_SECRET_KEY: string    // Stripe Secret Key (sk_live_... ou sk_test_...)
  STRIPE_WEBHOOK_SECRET: string // Stripe Webhook Signing Secret (whsec_...)
  CP_MERCHANT_ID?: string      // CoinPayments Merchant ID
  CP_PUBLIC_KEY?: string       // CoinPayments Public Key
  CP_PRIVATE_KEY?: string      // CoinPayments Private Key
  CP_IPN_SECRET?: string       // CoinPayments IPN Secret (vérification webhook)
  OPENAI_API_KEY: string       // OpenAI API Key (GPT-4o Vision — KYC + analyse preuve paiement)
  DEEPSEEK_API_KEY?: string    // DeepSeek API Key — support IA + agent admin (fallback: OpenAI)
  KYC_DOCS: R2Bucket           // R2 Bucket pour stockage documents KYC (kyc/{member_id}/{app_id}/{doc_type}.jpg)
  I18N_KV?: KVNamespace        // Cache KV traductions i18n (clé: i18n:{lang}:{hash})
}
